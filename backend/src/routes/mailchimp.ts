import express from 'express';
import { PrismaClient } from '../../../database/src/generated/prisma';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { mailChimpService, CampaignData } from '../services/mailchimpService';

const router = express.Router();
const prisma = new PrismaClient();

// Test MailChimp connection
router.get('/test', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const isConnected = await mailChimpService.testConnection();
    
    if (isConnected) {
      res.json({ 
        success: true, 
        message: 'MailChimp connection successful',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'MailChimp connection failed' 
      });
    }
  } catch (error) {
    console.error('MailChimp test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'MailChimp test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get campaign statistics
router.get('/stats', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const stats = await mailChimpService.getCampaignStats();
    
    if (stats) {
      res.json(stats);
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get campaign statistics' 
      });
    }
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get campaign statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send wellness referral emails
router.post('/campaigns/wellness', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { referralIds } = req.body;
    
    if (!referralIds || !Array.isArray(referralIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'referralIds array is required' 
      });
    }

    // Get referrals from database
    const referrals = await prisma.referral.findMany({
      where: {
        id: { in: referralIds },
        status: 'pending', // Only send to pending wellness referrals
      },
    });

    if (referrals.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No pending wellness referrals found' 
      });
    }

    // Prepare campaign data
    const campaignData: CampaignData[] = referrals.map(referral => ({
      templateId: 'wellness_referral',
      recipientEmail: referral.patientEmail || '',
      recipientName: referral.patientName,
      referralCode: referral.code,
      serviceName: 'Wellness Service', // This would come from the original appointment
      providerName: referral.referredBy,
      variables: {
        appointmentDate: new Date().toLocaleDateString(),
        clinicName: 'ZenConnect Clinic',
      },
    }));

    // Send wellness campaign
    const success = await mailChimpService.createWellnessCampaign(campaignData);

    if (success) {
      // Update referral status
      await prisma.referral.updateMany({
        where: { id: { in: referralIds } },
        data: { status: 'email_sent' },
      });

      // Log the campaign
      await prisma.auditLog.create({
        data: {
          action: 'EMAIL_CAMPAIGN',
          resource: 'REFERRAL',
          resourceId: referralIds.join(','),
          details: `Sent wellness referral emails to ${referrals.length} recipients`,
          userId: req.user!.id,
        },
      });

      res.json({ 
        success: true, 
        message: `Wellness campaign sent to ${referrals.length} recipients`,
        recipientsCount: referrals.length
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send wellness campaign' 
      });
    }
  } catch (error) {
    console.error('Error sending wellness campaign:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send wellness campaign',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send medical follow-up emails
router.post('/campaigns/medical', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { referralIds } = req.body;
    
    if (!referralIds || !Array.isArray(referralIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'referralIds array is required' 
      });
    }

    // Get referrals from database
    const referrals = await prisma.referral.findMany({
      where: {
        id: { in: referralIds },
        status: 'medical_only', // Only send to medical-only referrals
      },
    });

    if (referrals.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No medical referrals found' 
      });
    }

    // Prepare campaign data
    const campaignData: CampaignData[] = referrals.map(referral => ({
      templateId: 'medical_referral',
      recipientEmail: referral.patientEmail || '',
      recipientName: referral.patientName,
      serviceName: 'Medical Service', // This would come from the original appointment
      providerName: referral.referredBy,
      variables: {
        appointmentDate: new Date().toLocaleDateString(),
        clinicName: 'ZenConnect Clinic',
      },
    }));

    // Send medical campaign
    const success = await mailChimpService.createMedicalCampaign(campaignData);

    if (success) {
      // Update referral status
      await prisma.referral.updateMany({
        where: { id: { in: referralIds } },
        data: { status: 'follow_up_sent' },
      });

      // Log the campaign
      await prisma.auditLog.create({
        data: {
          action: 'EMAIL_CAMPAIGN',
          resource: 'REFERRAL',
          resourceId: referralIds.join(','),
          details: `Sent medical follow-up emails to ${referrals.length} recipients`,
          userId: req.user!.id,
        },
      });

      res.json({ 
        success: true, 
        message: `Medical follow-up campaign sent to ${referrals.length} recipients`,
        recipientsCount: referrals.length
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send medical campaign' 
      });
    }
  } catch (error) {
    console.error('Error sending medical campaign:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send medical campaign',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send single email (for testing)
router.post('/send-single', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { 
      email, 
      name, 
      type, 
      referralCode, 
      serviceName, 
      providerName 
    } = req.body;
    
    if (!email || !name || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'email, name, and type are required' 
      });
    }

    if (!['wellness', 'medical'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'type must be wellness or medical' 
      });
    }

    const campaignData: CampaignData = {
      templateId: type === 'wellness' ? 'wellness_referral' : 'medical_referral',
      recipientEmail: email,
      recipientName: name,
      referralCode: referralCode || '',
      serviceName: serviceName || `${type} service`,
      providerName: providerName || 'ZenConnect Clinic',
      variables: {
        appointmentDate: new Date().toLocaleDateString(),
        clinicName: 'ZenConnect Clinic',
      },
    };

    const success = await mailChimpService.sendTransactionalEmail(campaignData);

    if (success) {
      // Log the single email
      await prisma.auditLog.create({
        data: {
          action: 'SINGLE_EMAIL',
          resource: 'TEST',
          details: `Sent ${type} email to ${email}`,
          userId: req.user!.id,
        },
      });

      res.json({ 
        success: true, 
        message: `${type} email sent successfully to ${email}` 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send email' 
      });
    }
  } catch (error) {
    console.error('Error sending single email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get email templates
router.get('/templates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const templates = [
      {
        id: 'wellness_referral',
        name: 'Wellness Service Referral',
        type: 'wellness',
        description: 'Email sent to patients after wellness service appointments with referral code',
      },
      {
        id: 'medical_referral',
        name: 'Medical Service Follow-up',
        type: 'medical',
        description: 'Follow-up email sent to patients after medical service appointments',
      },
    ];

    res.json({ templates });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get email templates',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;


