import express from 'express';
import { PrismaClient } from '../../../database/src/generated/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all referrals
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { patientName: { contains: search as string, mode: 'insensitive' } },
        { patientEmail: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { referredBy: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.referral.count({ where }),
    ]);

    res.json({
      referrals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

// Get single referral
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const referral = await prisma.referral.findUnique({
      where: { id: req.params.id },
    });

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    res.json(referral);
  } catch (error) {
    console.error('Error fetching referral:', error);
    res.status(500).json({ error: 'Failed to fetch referral' });
  }
});

// Create referral
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { patientName, patientEmail, patientPhone, referredBy, notes } = req.body;

    if (!patientName || !referredBy) {
      return res.status(400).json({ error: 'Patient name and referred by are required' });
    }

    // Generate unique referral code
    const code = `REF${Date.now().toString().slice(-6)}`;

    const referral = await prisma.referral.create({
      data: {
        code,
        patientName,
        patientEmail,
        patientPhone,
        referredBy,
        notes,
      },
    });

    // Log the creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        resource: 'REFERRAL',
        resourceId: referral.id,
        details: `Created referral: ${code} for ${patientName}`,
        userId: req.user!.id,
      },
    });

    res.status(201).json(referral);
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

// Update referral
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { patientName, patientEmail, patientPhone, referredBy, status, notes } = req.body;

    const existingReferral = await prisma.referral.findUnique({
      where: { id: req.params.id },
    });

    if (!existingReferral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    const referral = await prisma.referral.update({
      where: { id: req.params.id },
      data: {
        ...(patientName && { patientName }),
        ...(patientEmail !== undefined && { patientEmail }),
        ...(patientPhone !== undefined && { patientPhone }),
        ...(referredBy && { referredBy }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        resource: 'REFERRAL',
        resourceId: referral.id,
        details: `Updated referral: ${referral.code}`,
        userId: req.user!.id,
      },
    });

    res.json(referral);
  } catch (error) {
    console.error('Error updating referral:', error);
    res.status(500).json({ error: 'Failed to update referral' });
  }
});

// Delete referral
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const existingReferral = await prisma.referral.findUnique({
      where: { id: req.params.id },
    });

    if (!existingReferral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    await prisma.referral.delete({
      where: { id: req.params.id },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        resource: 'REFERRAL',
        resourceId: req.params.id,
        details: `Deleted referral: ${existingReferral.code}`,
        userId: req.user!.id,
      },
    });

    res.json({ message: 'Referral deleted successfully' });
  } catch (error) {
    console.error('Error deleting referral:', error);
    res.status(500).json({ error: 'Failed to delete referral' });
  }
});

export default router;


