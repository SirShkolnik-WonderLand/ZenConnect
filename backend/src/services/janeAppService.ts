import { PrismaClient } from '../../../database/src/generated/prisma';
import csv from 'csv-parser';
import fs from 'fs';

const prisma = new PrismaClient();

// Jane App CSV format interface
export interface JaneAppCSVRow {
  // Patient information
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  
  // Appointment details
  appointmentDate: string;
  serviceName: string;
  serviceCategory?: string;
  providerName: string;
  
  // Additional fields
  notes?: string;
  referralSource?: string;
  insuranceProvider?: string;
}

// Service classification types
export type ServiceType = 'wellness' | 'medical' | 'unknown';

export interface ClassifiedService {
  serviceName: string;
  category: string;
  type: ServiceType;
  confidence: number;
  requiresManualReview: boolean;
}

// Service classification engine
export class ServiceClassificationEngine {
  private wellnessKeywords = [
    'massage', 'spa', 'wellness', 'facial', 'acupuncture', 'chiropractic',
    'nutrition', 'diet', 'fitness', 'yoga', 'meditation', 'aromatherapy',
    'reflexology', 'reiki', 'energy healing', 'holistic', 'alternative',
    'complementary', 'beauty', 'skincare', 'bodywork', 'therapeutic'
  ];

  private medicalKeywords = [
    'doctor', 'physician', 'nurse', 'medical', 'clinic', 'hospital',
    'surgery', 'diagnosis', 'treatment', 'therapy', 'physical therapy',
    'occupational therapy', 'speech therapy', 'psychology', 'psychiatry',
    'counseling', 'mental health', 'pediatric', 'dermatology', 'cardiology',
    'orthopedic', 'neurology', 'oncology', 'radiology', 'laboratory',
    'blood test', 'x-ray', 'mri', 'scan', 'prescription', 'medication'
  ];

  classifyService(serviceName: string, category?: string): ClassifiedService {
    const serviceLower = serviceName.toLowerCase();
    const categoryLower = category?.toLowerCase() || '';

    // Check for medical keywords
    const medicalMatches = this.medicalKeywords.filter(keyword => 
      serviceLower.includes(keyword) || categoryLower.includes(keyword)
    );

    // Check for wellness keywords
    const wellnessMatches = this.wellnessKeywords.filter(keyword => 
      serviceLower.includes(keyword) || categoryLower.includes(keyword)
    );

    // Calculate confidence
    const totalMatches = medicalMatches.length + wellnessMatches.length;
    const confidence = totalMatches > 0 ? Math.min(1, totalMatches / 3) : 0;

    // Determine service type
    let type: ServiceType;
    let requiresManualReview = false;

    if (medicalMatches.length > wellnessMatches.length) {
      type = 'medical';
    } else if (wellnessMatches.length > medicalMatches.length) {
      type = 'wellness';
    } else {
      type = 'unknown';
      requiresManualReview = true;
    }

    // If confidence is low, require manual review
    if (confidence < 0.3) {
      requiresManualReview = true;
    }

    return {
      serviceName,
      category: category || 'general',
      type,
      confidence,
      requiresManualReview
    };
  }

  // Add custom service classification rules
  async addServiceRule(serviceName: string, type: ServiceType) {
    // Store in database for future reference
    await prisma.service.upsert({
      where: { id: `temp-${Date.now()}` },
      update: { 
        category: type === 'wellness' ? 'wellness' : 'medical',
        status: 'active'
      },
      create: {
        name: serviceName,
        category: type === 'wellness' ? 'wellness' : 'medical',
        description: `Custom rule for ${serviceName}`,
        status: 'active'
      }
    });
  }

  // Get service classification from database
  async getServiceClassification(serviceName: string): Promise<ClassifiedService | null> {
    const service = await prisma.service.findFirst({
      where: { 
        name: { contains: serviceName },
        status: 'active'
      }
    });

    if (service) {
      return {
        serviceName: service.name,
        category: service.category,
        type: service.category === 'wellness' ? 'wellness' : 'medical',
        confidence: 1.0,
        requiresManualReview: false
      };
    }

    return null;
  }
}

// Jane App CSV processor
export class JaneAppProcessor {
  private classificationEngine = new ServiceClassificationEngine();

  async processCSV(filePath: string, userId: string): Promise<{
    processed: number;
    referrals: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      referrals: 0,
      errors: [] as string[]
    };

    const rows: JaneAppCSVRow[] = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({
          // Handle different CSV formats
          headers: [
            'patientName', 'patientEmail', 'patientPhone', 'appointmentDate',
            'serviceName', 'serviceCategory', 'providerName', 'notes',
            'referralSource', 'insuranceProvider'
          ]
        }))
        .on('data', (row) => {
          // Clean and validate data
          const cleanRow: JaneAppCSVRow = {
            patientName: this.cleanString((row.patientName || row['Patient Name'] || row.name) as string),
            patientEmail: this.cleanString((row.patientEmail || row['Patient Email'] || row.email) as string),
            patientPhone: this.cleanString((row.patientPhone || row['Patient Phone'] || row.phone) as string),
            appointmentDate: this.cleanString((row.appointmentDate || row['Appointment Date'] || row.date) as string),
            serviceName: this.cleanString((row.serviceName || row['Service Name'] || row.service) as string),
            serviceCategory: this.cleanString((row.serviceCategory || row['Service Category'] || row.category) as string),
            providerName: this.cleanString((row.providerName || row['Provider Name'] || row.provider) as string),
            notes: this.cleanString((row.notes || row.Notes || row.description) as string),
            referralSource: this.cleanString((row.referralSource || row['Referral Source']) as string),
            insuranceProvider: this.cleanString((row.insuranceProvider || row['Insurance Provider']) as string)
          };

          if (cleanRow.patientName && cleanRow.serviceName) {
            rows.push(cleanRow);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    results.processed = rows.length;

    // Process each row
    for (const row of rows) {
      try {
        await this.processAppointment(row, userId);
        results.referrals++;
      } catch (error) {
        results.errors.push(`Error processing ${row.patientName}: ${error}`);
        console.error('Error processing appointment:', error);
      }
    }

    return results;
  }

  private async processAppointment(row: JaneAppCSVRow, userId: string): Promise<void> {
    // Check if we have a database classification first
    let classification = await this.classificationEngine.getServiceClassification(row.serviceName);
    
    // If not found, use the engine to classify
    if (!classification) {
      classification = this.classificationEngine.classifyService(
        row.serviceName, 
        row.serviceCategory
      );
    }

    // Create referral record
    const referralCode = this.generateReferralCode();
    
    await prisma.referral.create({
      data: {
        code: referralCode,
        patientName: row.patientName,
        patientEmail: row.patientEmail || null,
        patientPhone: row.patientPhone || null,
        referredBy: row.providerName,
        status: classification.type === 'wellness' ? 'pending' : 'medical_only',
        notes: `Service: ${row.serviceName} | Type: ${classification.type} | ${row.notes || ''}`.trim()
      }
    });

    // Log the processing
    await prisma.auditLog.create({
      data: {
        action: 'CSV_PROCESSING',
        resource: 'REFERRAL',
        details: `Processed appointment for ${row.patientName} - Service: ${row.serviceName} (${classification.type})`,
        userId
      }
    });

    // If it's a wellness service, mark for email campaign
    if (classification.type === 'wellness') {
      // TODO: Queue email campaign
      console.log(`Wellness service detected: ${row.serviceName} for ${row.patientName}`);
    }

    // If it requires manual review, create a task
    if (classification.requiresManualReview) {
      await prisma.task.create({
        data: {
          title: `Review service classification: ${row.serviceName}`,
          description: `Service: ${row.serviceName}\nPatient: ${row.patientName}\nProvider: ${row.providerName}\nClassification: ${classification.type} (confidence: ${classification.confidence})`,
          status: 'pending',
          priority: 'medium',
          userId
        }
      });
    }
  }

  private cleanString(value: any): string {
    if (!value || typeof value !== 'string') return '';
    return value.trim();
  }

  private generateReferralCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    return `REF-${timestamp}-${random}`.toUpperCase();
  }
}

export const janeAppProcessor = new JaneAppProcessor();
export const serviceClassificationEngine = new ServiceClassificationEngine();
