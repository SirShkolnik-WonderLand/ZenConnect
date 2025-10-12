import express from 'express';
import { PrismaClient } from '../../../database/src/generated/prisma';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { serviceClassificationEngine, ServiceType } from '../services/janeAppService';

const router = express.Router();
const prisma = new PrismaClient();

// Get all services
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 50, category, type, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (type) {
      where.category = type;
    }

    if (search) {
      where.name = {
        contains: search as string,
        mode: 'insensitive'
      };
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit),
      }),
      prisma.service.count({ where }),
    ]);

    res.json({
      services,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get service by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// Create new service
router.post('/', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { name, category, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const service = await prisma.service.create({
      data: {
        name,
        category,
        description: description || null,
      },
    });

    // Log the creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        resource: 'SERVICE',
        resourceId: service.id,
        details: `Created service: ${name} (${category})`,
        userId: req.user!.id,
      },
    });

    res.status(201).json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Update service
router.put('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { name, category, description, status } = req.body;

    const existingService = await prisma.service.findUnique({
      where: { id: req.params.id },
    });

    if (!existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        name: name || existingService.name,
        category: category || existingService.category,
        description: description !== undefined ? description : existingService.description,
        status: status || existingService.status,
      },
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        resource: 'SERVICE',
        resourceId: service.id,
        details: `Updated service: ${service.name}`,
        userId: req.user!.id,
      },
    });

    res.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Delete service
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    await prisma.service.delete({
      where: { id: req.params.id },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        resource: 'SERVICE',
        resourceId: req.params.id,
        details: `Deleted service: ${service.name}`,
        userId: req.user!.id,
      },
    });

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Classify a service
router.post('/classify', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { serviceName, category } = req.body;

    if (!serviceName) {
      return res.status(400).json({ error: 'Service name is required' });
    }

    const classification = serviceClassificationEngine.classifyService(serviceName, category);

    res.json(classification);
  } catch (error) {
    console.error('Error classifying service:', error);
    res.status(500).json({ error: 'Failed to classify service' });
  }
});

// Add service classification rule
router.post('/rules', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { serviceName, type } = req.body;

    if (!serviceName || !type) {
      return res.status(400).json({ error: 'Service name and type are required' });
    }

    if (!['wellness', 'medical'].includes(type)) {
      return res.status(400).json({ error: 'Type must be wellness or medical' });
    }

    await serviceClassificationEngine.addServiceRule(serviceName, type as ServiceType);

    // Log the rule creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_RULE',
        resource: 'SERVICE_RULE',
        details: `Created classification rule: ${serviceName} -> ${type}`,
        userId: req.user!.id,
      },
    });

    res.json({ message: 'Service classification rule added successfully' });
  } catch (error) {
    console.error('Error adding service rule:', error);
    res.status(500).json({ error: 'Failed to add service rule' });
  }
});

// Get service statistics
router.get('/stats/overview', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const [totalServices, wellnessServices, medicalServices, unknownServices] = await Promise.all([
      prisma.service.count(),
      prisma.service.count({ where: { category: 'wellness' } }),
      prisma.service.count({ where: { category: 'medical' } }),
      prisma.service.count({ where: { category: 'unknown' } }),
    ]);

    const [activeServices, inactiveServices] = await Promise.all([
      prisma.service.count({ where: { status: 'active' } }),
      prisma.service.count({ where: { status: 'inactive' } }),
    ]);

    res.json({
      total: totalServices,
      byType: {
        wellness: wellnessServices,
        medical: medicalServices,
        unknown: unknownServices,
      },
      byStatus: {
        active: activeServices,
        inactive: inactiveServices,
      },
    });
  } catch (error) {
    console.error('Error fetching service stats:', error);
    res.status(500).json({ error: 'Failed to fetch service statistics' });
  }
});

export default router;