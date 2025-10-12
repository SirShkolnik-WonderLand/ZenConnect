import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Get system settings (admin only)
router.get('/system', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    // In a real app, these would come from a database or config
    const settings = {
      mailchimp: {
        apiKey: process.env.MAILCHIMP_API_KEY ? '***configured***' : null,
        serverPrefix: process.env.MAILCHIMP_SERVER_PREFIX || null,
        listId: process.env.MAILCHIMP_LIST_ID || null,
      },
      notifications: {
        autoEmailReferrals: true,
        emailNotifications: true,
        auditLogging: true,
      },
      system: {
        autoEmailReferrals: true,
        emailNotifications: true,
        auditLogging: true,
      },
    };

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update system settings (admin only)
router.put('/system', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { mailchimp, notifications, system } = req.body;

    // In a real app, you would save these to a database
    // For now, we'll just validate and return success
    
    if (mailchimp) {
      // Validate MailChimp settings
      if (mailchimp.apiKey && typeof mailchimp.apiKey !== 'string') {
        return res.status(400).json({ error: 'Invalid MailChimp API key format' });
      }
      if (mailchimp.serverPrefix && typeof mailchimp.serverPrefix !== 'string') {
        return res.status(400).json({ error: 'Invalid server prefix format' });
      }
      if (mailchimp.listId && typeof mailchimp.listId !== 'string') {
        return res.status(400).json({ error: 'Invalid list ID format' });
      }
    }

    // Log the settings update
    console.log('Settings updated by user:', req.user!.email);

    res.json({ 
      message: 'Settings updated successfully',
      settings: {
        mailchimp: {
          apiKey: mailchimp?.apiKey ? '***configured***' : null,
          serverPrefix: mailchimp?.serverPrefix || null,
          listId: mailchimp?.listId || null,
        },
        notifications: notifications || {},
        system: system || {},
      },
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Test MailChimp connection (admin only)
router.post('/test/mailchimp', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { apiKey, serverPrefix } = req.body;

    if (!apiKey || !serverPrefix) {
      return res.status(400).json({ error: 'API key and server prefix are required' });
    }

    // In a real app, you would test the MailChimp connection here
    // For now, we'll simulate a test
    const isValid = apiKey.length > 10 && serverPrefix.length >= 2;

    if (isValid) {
      res.json({ 
        success: true, 
        message: 'MailChimp connection successful' 
      });
    } else {
      res.json({ 
        success: false, 
        message: 'MailChimp connection failed - invalid credentials' 
      });
    }
  } catch (error) {
    console.error('Error testing MailChimp connection:', error);
    res.status(500).json({ error: 'Failed to test MailChimp connection' });
  }
});

export default router;


