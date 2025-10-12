import mailchimp from '@mailchimp/mailchimp_marketing';

// Check if MailChimp is configured
const isMailChimpConfigured = () => {
  return !!(process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_SERVER_PREFIX);
};

// MailChimp configuration
if (isMailChimpConfigured()) {
  mailchimp.setConfig({
    apiKey: process.env.MAILCHIMP_API_KEY || '',
    server: process.env.MAILCHIMP_SERVER_PREFIX || 'us1', // e.g., 'us1' for us1.api.mailchimp.com
  });
}

export interface MailChimpContact {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: 'wellness' | 'medical';
  subject: string;
  content: string;
  variables: string[];
}

export interface CampaignData {
  templateId: string;
  recipientEmail: string;
  recipientName: string;
  referralCode?: string;
  serviceName?: string;
  providerName?: string;
  variables?: Record<string, string>;
}

export class MailChimpService {
  private listId: string;

  constructor() {
    this.listId = process.env.MAILCHIMP_LIST_ID || '';
  }

  // Initialize and test connection
  async testConnection(): Promise<boolean> {
    if (!isMailChimpConfigured()) {
      console.warn('MailChimp not configured - please set MAILCHIMP_API_KEY and MAILCHIMP_SERVER_PREFIX environment variables');
      return false;
    }

    try {
      const response = await mailchimp.ping.get();
      console.log('MailChimp connection successful:', response);
      return true;
    } catch (error) {
      console.error('MailChimp connection failed:', error);
      return false;
    }
  }

  // Add contact to MailChimp list
  async addContact(contact: MailChimpContact): Promise<boolean> {
    if (!isMailChimpConfigured()) {
      console.warn('MailChimp not configured');
      return false;
    }

    try {
      const response = await mailchimp.lists.addListMember(this.listId, {
        email_address: contact.email,
        status: 'subscribed',
        merge_fields: {
          FNAME: contact.firstName || '',
          LNAME: contact.lastName || '',
          PHONE: contact.phone || '',
        },
        tags: contact.tags || [],
      });

      console.log('Contact added successfully:', (response as any).id);
      return true;
    } catch (error: any) {
      if (error.status === 400 && error.title === 'Member Exists') {
        console.log('Contact already exists, updating...');
        return this.updateContact(contact);
      }
      console.error('Error adding contact:', error);
      return false;
    }
  }

  // Update existing contact
  async updateContact(contact: MailChimpContact): Promise<boolean> {
    try {
      const subscriberHash = this.generateSubscriberHash(contact.email);
      
      const response = await mailchimp.lists.updateListMember(
        this.listId,
        subscriberHash,
        {
          merge_fields: {
            FNAME: contact.firstName || '',
            LNAME: contact.lastName || '',
            PHONE: contact.phone || '',
          },
        }
      );

      console.log('Contact updated successfully:', (response as any).id);
      return true;
    } catch (error) {
      console.error('Error updating contact:', error);
      return false;
    }
  }

  // Send transactional email (using MailChimp's Transactional API)
  async sendTransactionalEmail(campaignData: CampaignData): Promise<boolean> {
    try {
      // For now, we'll use a simple approach with MailChimp's marketing API
      // In production, you'd want to use Mandrill (MailChimp's transactional service)
      
      const template = await this.getEmailTemplate(campaignData.templateId);
      if (!template) {
        console.error('Template not found:', campaignData.templateId);
        return false;
      }

      // Replace template variables
      let emailContent = template.content;
      let emailSubject = template.subject;

      const variables = {
        recipientName: campaignData.recipientName,
        referralCode: campaignData.referralCode || '',
        serviceName: campaignData.serviceName || '',
        providerName: campaignData.providerName || '',
        ...campaignData.variables,
      };

      // Replace variables in content
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        emailContent = emailContent.replace(new RegExp(placeholder, 'g'), value);
        emailSubject = emailSubject.replace(new RegExp(placeholder, 'g'), value);
      });

      // Add contact to list first
      await this.addContact({
        email: campaignData.recipientEmail,
        firstName: campaignData.recipientName.split(' ')[0],
        lastName: campaignData.recipientName.split(' ').slice(1).join(' '),
        tags: [`${template.type}_service`, 'referral_campaign'],
      });

      console.log('Transactional email prepared for:', campaignData.recipientEmail);
      console.log('Subject:', emailSubject);
      console.log('Template type:', template.type);
      
      // In a real implementation, you'd send the actual email here
      // For now, we'll log the success
      return true;
    } catch (error) {
      console.error('Error sending transactional email:', error);
      return false;
    }
  }

  // Get email template (stored in database or config)
  async getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
    // In a real implementation, you'd fetch from database
    // For now, we'll return predefined templates
    const templates: EmailTemplate[] = [
      {
        id: 'wellness_referral',
        name: 'Wellness Service Referral',
        type: 'wellness',
        subject: 'Thank you for choosing {{serviceName}} - Your referral code: {{referralCode}}',
        content: `
          <html>
            <body>
              <h2>Hello {{recipientName}}!</h2>
              <p>Thank you for visiting {{providerName}} for your {{serviceName}} appointment.</p>
              <p>As a valued patient, you can now refer friends and family to our wellness services!</p>
              
              <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Your Referral Code: <strong>{{referralCode}}</strong></h3>
                <p>Share this code with friends and family for special wellness service discounts!</p>
              </div>
              
              <p>Terms and conditions apply. This referral program is for wellness services only.</p>
              
              <p>Best regards,<br>{{providerName}} Team</p>
            </body>
          </html>
        `,
        variables: ['recipientName', 'referralCode', 'serviceName', 'providerName'],
      },
      {
        id: 'medical_referral',
        name: 'Medical Service Follow-up',
        type: 'medical',
        subject: 'Thank you for your {{serviceName}} appointment with {{providerName}}',
        content: `
          <html>
            <body>
              <h2>Hello {{recipientName}}!</h2>
              <p>Thank you for visiting {{providerName}} for your {{serviceName}} appointment.</p>
              <p>We hope your visit was helpful and that you're feeling better.</p>
              
              <p>If you found our services valuable, we'd appreciate if you could share your experience with others who might benefit from our medical services.</p>
              
              <p>Please note: We do not offer referral rewards for medical services in compliance with healthcare regulations.</p>
              
              <p>Best regards,<br>{{providerName}} Team</p>
            </body>
          </html>
        `,
        variables: ['recipientName', 'serviceName', 'providerName'],
      },
    ];

    return templates.find(t => t.id === templateId) || null;
  }

  // Create email campaign for wellness referrals
  async createWellnessCampaign(recipients: CampaignData[]): Promise<boolean> {
    try {
      console.log(`Creating wellness campaign for ${recipients.length} recipients`);
      
      for (const recipient of recipients) {
        await this.sendTransactionalEmail({
          ...recipient,
          templateId: 'wellness_referral',
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error creating wellness campaign:', error);
      return false;
    }
  }

  // Create email campaign for medical follow-ups
  async createMedicalCampaign(recipients: CampaignData[]): Promise<boolean> {
    try {
      console.log(`Creating medical campaign for ${recipients.length} recipients`);
      
      for (const recipient of recipients) {
        await this.sendTransactionalEmail({
          ...recipient,
          templateId: 'medical_referral',
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error creating medical campaign:', error);
      return false;
    }
  }

  // Get campaign statistics
  async getCampaignStats(): Promise<any> {
    if (!isMailChimpConfigured()) {
      console.warn('MailChimp not configured');
      return null;
    }

    try {
      const campaigns = await mailchimp.campaigns.list({
        count: 10,
        status: 'sent',
      });

      return {
        totalCampaigns: (campaigns as any).campaigns.length,
        campaigns: (campaigns as any).campaigns.map((campaign: any) => ({
          id: campaign.id,
          subject: campaign.settings.subject_line,
          sendTime: campaign.send_time,
          recipients: campaign.recipients.recipient_count,
        })),
      };
    } catch (error) {
      console.error('Error getting campaign stats:', error);
      return null;
    }
  }

  // Helper method to generate subscriber hash
  private generateSubscriberHash(email: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  }
}

export const mailChimpService = new MailChimpService();
