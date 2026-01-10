const Lead = require("../models/Lead");
const sendEmail = require("../utils/email");

// POST /leads - Create a new lead (with email notification)
exports.createLead = async (req, res, next) => {
  try {
    const { email, source = "other", notes } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Valid email address is required",
        },
      });
    }

    // Check if lead already exists
    const existingLead = await Lead.findOne({ email: email.toLowerCase().trim() });

    if (existingLead) {
      // Update existing lead if needed
      existingLead.subscribed = true;
      existingLead.source = source || existingLead.source;
      if (notes) {
        existingLead.notes = notes;
      }
      await existingLead.save();

      // Send thank you email if not already sent
      if (!existingLead.emailSent) {
        try {
          await sendThankYouEmail(existingLead.email);
          existingLead.emailSent = true;
          existingLead.emailSentAt = new Date();
          await existingLead.save();
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
          // Don't fail the request if email fails
        }
      }

      return res.status(200).json({
        message: "Lead updated successfully (already subscribed)",
        lead: {
          id: existingLead._id.toString(),
          email: existingLead.email,
          source: existingLead.source,
          subscribed: existingLead.subscribed,
          emailSent: existingLead.emailSent,
          createdAt: existingLead.createdAt,
          updatedAt: existingLead.updatedAt,
        },
      });
    }

    // Create new lead
    const lead = await Lead.create({
      email: email.toLowerCase().trim(),
      source: source || "other",
      subscribed: true,
      notes: notes || "",
    });

    // Send thank you email
    try {
      await sendThankYouEmail(lead.email);
      lead.emailSent = true;
      lead.emailSentAt = new Date();
      await lead.save();
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      message: "Lead created successfully and thank you email sent",
      lead: {
        id: lead._id.toString(),
        email: lead.email,
        source: lead.source,
        subscribed: lead.subscribed,
        emailSent: lead.emailSent,
        emailSentAt: lead.emailSentAt,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      },
    });
  } catch (error) {
    console.error("Create lead error:", error);
    res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to create lead",
      },
    });
  }
};

// Helper function to send thank you email
async function sendThankYouEmail(email) {
  const emailSubject = "Thank You for Subscribing to KUMU Coaching!";
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Subscribing</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Welcome to KUMU Coaching!</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Thank you for subscribing to <strong>KUMU Coaching</strong>!
                  </p>
                  
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    We're thrilled to have you join our community of cricket enthusiasts. You're now on the path to unlocking your potential and mastering the game like a professional.
                  </p>
                  
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    <strong>What's Next?</strong>
                  </p>
                  
                  <ul style="color: #333333; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                    <li>Access world-class cricket coaching techniques</li>
                    <li>Learn from professional coaching methods</li>
                    <li>Transform your game with expert guidance</li>
                    <li>Join thousands of players improving their skills</li>
                  </ul>
                  
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    Get started with <strong>professional cricket coaching from just £20 per year</strong>.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://apps.apple.com/pk/app/kumu-coaching/id1577507631" 
                       style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Download the App Now
                    </a>
                  </div>
                  
                  <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    Best regards,<br>
                    <strong>The KUMU Coaching Team</strong>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
                    If you have any questions, feel free to contact us at <a href="mailto:support@kumu.com" style="color: #f97316;">support@kumu.com</a>
                  </p>
                  <p style="color: #999999; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} KUMU Coaching. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const emailText = `
    Thank you for subscribing to KUMU Coaching!
    
    We're thrilled to have you join our community of cricket enthusiasts. You're now on the path to unlocking your potential and mastering the game like a professional.
    
    What's Next?
    - Access world-class cricket coaching techniques
    - Learn from professional coaching methods
    - Transform your game with expert guidance
    - Join thousands of players improving their skills
    
    Get started with professional cricket coaching from just £20 per year.
    
    Download the app: https://apps.apple.com/pk/app/kumu-coaching/id1577507631
    
    Best regards,
    The KUMU Coaching Team
    
    Questions? Contact us at support@kumu.com
  `;

  await sendEmail({
    to: email,
    subject: emailSubject,
    text: emailText,
    html: emailHtml,
  });
}

// GET /leads - Get all leads
exports.getAllLeads = async (req, res, next) => {
  try {
    const { page = 1, limit = 100, search, subscribed, source } = req.query;
    const query = {};

    // Add search filter
    if (search) {
      query.email = { $regex: search, $options: "i" };
    }

    // Add subscribed filter
    if (subscribed !== undefined) {
      query.subscribed = subscribed === "true";
    }

    // Add source filter
    if (source) {
      query.source = source;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Lead.countDocuments(query);

    res.status(200).json({
      message: "Leads retrieved successfully",
      leads: leads.map((lead) => ({
        id: lead._id.toString(),
        email: lead.email,
        source: lead.source,
        subscribed: lead.subscribed,
        emailSent: lead.emailSent,
        emailSentAt: lead.emailSentAt,
        notes: lead.notes,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all leads error:", error);
    res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to retrieve leads",
      },
    });
  }
};

// GET /leads/:id - Get a single lead by ID
exports.getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Lead ID is required",
        },
      });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        error: {
          code: "404",
          message: "Lead not found",
        },
      });
    }

    res.status(200).json({
      message: "Lead retrieved successfully",
      lead: {
        id: lead._id.toString(),
        email: lead.email,
        source: lead.source,
        subscribed: lead.subscribed,
        emailSent: lead.emailSent,
        emailSentAt: lead.emailSentAt,
        notes: lead.notes,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get lead by ID error:", error);
    res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to retrieve lead",
      },
    });
  }
};

// PUT /leads/:id - Update a lead
exports.updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, source, subscribed, notes, resendEmail } = req.body;

    if (!id) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Lead ID is required",
        },
      });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        error: {
          code: "404",
          message: "Lead not found",
        },
      });
    }

    // Update fields
    if (email && email !== lead.email) {
      // Check if new email already exists
      const existingLead = await Lead.findOne({ email: email.toLowerCase().trim() });
      if (existingLead && existingLead._id.toString() !== id) {
        return res.status(409).json({
          error: {
            code: "409",
            message: "Email already exists",
          },
        });
      }
      lead.email = email.toLowerCase().trim();
    }

    if (source !== undefined) {
      lead.source = source;
    }

    if (subscribed !== undefined) {
      lead.subscribed = subscribed;
    }

    if (notes !== undefined) {
      lead.notes = notes;
    }

    // Resend email if requested
    if (resendEmail === true) {
      try {
        await sendThankYouEmail(lead.email);
        lead.emailSent = true;
        lead.emailSentAt = new Date();
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
      }
    }

    await lead.save();

    res.status(200).json({
      message: "Lead updated successfully",
      lead: {
        id: lead._id.toString(),
        email: lead.email,
        source: lead.source,
        subscribed: lead.subscribed,
        emailSent: lead.emailSent,
        emailSentAt: lead.emailSentAt,
        notes: lead.notes,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update lead error:", error);
    res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to update lead",
      },
    });
  }
};

// DELETE /leads/:id - Delete a lead
exports.deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Lead ID is required",
        },
      });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        error: {
          code: "404",
          message: "Lead not found",
        },
      });
    }

    await Lead.findByIdAndDelete(id);

    res.status(200).json({
      message: "Lead deleted successfully",
      deletedLead: {
        id: lead._id.toString(),
        email: lead.email,
      },
    });
  } catch (error) {
    console.error("Delete lead error:", error);
    res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to delete lead",
      },
    });
  }
};
