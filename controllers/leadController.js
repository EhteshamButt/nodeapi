const Lead = require("../models/Lead");
const sendEmail = require("../utils/email");
const fs = require("fs");
const path = require("path");

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
  const emailSubject = "Welcome to Kumu! 🏏";
  
  // Prepare image attachment
  const imagePath = path.join(__dirname, "../utils/image0.jpeg");
  let attachments = [];
  
  if (fs.existsSync(imagePath)) {
    attachments = [
      {
        filename: "kumu-banner.jpg",
        path: imagePath,
        cid: "kumuBanner", // Content ID for referencing in HTML
      },
    ];
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Kumu</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
        <tr>
          <td align="center" style="padding: 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
              <!-- Top Banner Image -->
              <tr>
                <td style="padding: 0; line-height: 0;">
                  <img src="${attachments.length > 0 ? 'cid:kumuBanner' : 'https://via.placeholder.com/600x300'}" 
                       alt="Kumu Cricket Training" 
                       style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;" />
                </td>
              </tr>
              
              <!-- Welcome Section -->
              <tr>
                <td style="padding: 50px 40px 30px 40px; background-color: #ffffff;">
                  <h1 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 32px; font-weight: 700; line-height: 1.2;">
                    Welcome to Kumu 👋
                  </h1>
                  <p style="color: #4a4a4a; font-size: 18px; line-height: 1.7; margin: 0 0 30px 0;">
                    You've just unlocked a smarter way to train. Kumu breaks cricket skills down clearly, visually, and at your pace — so improvement actually sticks.
                  </p>
                </td>
              </tr>
              
              <!-- Features Section -->
              <tr>
                <td style="padding: 0 40px 30px 40px; background-color: #ffffff;">
                  <h2 style="color: #1a1a1a; margin: 0 0 25px 0; font-size: 24px; font-weight: 700;">
                    What you can do inside Kumu:
                  </h2>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 0 0 15px 0; vertical-align: top;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 0 15px 0 0; vertical-align: top;">
                              <span style="color: #22c55e; font-size: 20px; line-height: 1.5;">✓</span>
                            </td>
                            <td style="padding: 0;">
                              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0;">
                                Explore skills shot by shot
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 0 15px 0; vertical-align: top;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 0 15px 0 0; vertical-align: top;">
                              <span style="color: #22c55e; font-size: 20px; line-height: 1.5;">✓</span>
                            </td>
                            <td style="padding: 0;">
                              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0;">
                                Understand the 'why', not just the movement
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0; vertical-align: top;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 0 15px 0 0; vertical-align: top;">
                              <span style="color: #22c55e; font-size: 20px; line-height: 1.5;">✓</span>
                            </td>
                            <td style="padding: 0;">
                              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0;">
                                Train confidently, anytime, anywhere
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- CTA Button -->
              <tr>
                <td style="padding: 0 40px 40px 40px; background-color: #ffffff; text-align: center;">
                  <a href="https://apps.apple.com/pk/app/kumu-coaching/id1577507631" 
                     style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px;">
                    START YOUR FIRST SESSION
                  </a>
                </td>
              </tr>
              
              <!-- Target Audience Section -->
              <tr>
                <td style="padding: 0 40px 50px 40px; background-color: #ffffff;">
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                    Built for:
                  </p>
                  <p style="color: #1a1a1a; font-size: 18px; font-weight: 700; line-height: 1.6; margin: 0 0 15px 0;">
                    Players • Parents • Coaches
                  </p>
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.7; margin: 0;">
                    From fundamentals to <strong>advanced skills.</strong><br>
                    You're always in control of the pace.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #ffffff; border-top: 1px solid #e5e7eb; text-align: center;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 0 0 15px 0;">
                        <span style="color: #1a1a1a; font-size: 24px; font-weight: 700; letter-spacing: 2px;">K</span>
                        <span style="color: #1a1a1a; font-size: 20px; font-weight: 700; letter-spacing: 1px;">KUMU</span>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 0;">
                        <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 0;">
                          © ${new Date().getFullYear()} Kumu. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
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
    Welcome to Kumu 👋
    
    You've just unlocked a smarter way to train. Kumu breaks cricket skills down clearly, visually, and at your pace — so improvement actually sticks.
    
    What you can do inside Kumu:
    ✓ Explore skills shot by shot
    ✓ Understand the 'why', not just the movement
    ✓ Train confidently, anytime, anywhere
    
    START YOUR FIRST SESSION: https://apps.apple.com/pk/app/kumu-coaching/id1577507631
    
    Built for: Players • Parents • Coaches
    From fundamentals to advanced skills.
    You're always in control of the pace.
    
    © ${new Date().getFullYear()} Kumu. All rights reserved.
  `;

  await sendEmail({
    to: email,
    subject: emailSubject,
    text: emailText,
    html: emailHtml,
    attachments: attachments,
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
