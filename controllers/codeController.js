const Code = require("../models/Code");
const mongoose = require("mongoose");

// Set CORS headers helper
const setCorsHeaders = (res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

// POST /codes - Create a new code
exports.createCode = async (req, res, next) => {
  setCorsHeaders(res);

  try {
    const { code, description, discount, isActive } = req.body;

    if (!code) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Code is required",
        },
      });
    }

    // Check if code already exists
    const existingCode = await Code.findOne({ code: code.trim() });
    if (existingCode) {
      return res.status(409).json({
        error: {
          code: "409",
          message: "Code already exists",
        },
      });
    }

    // Validate and parse discount if provided
    let discountValue = 0;
    if (discount !== undefined && discount !== null) {
      // Convert string to number if needed
      discountValue = typeof discount === "string" ? parseFloat(discount) : Number(discount);
      
      if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
        return res.status(400).json({
          error: {
            code: "400",
            message: "Discount must be a number between 0 and 100",
          },
        });
      }
    }

    // Create code object with explicit discount field - ALWAYS set it
    const codeData = {
      code: code.trim(),
      description: description || "",
      discount: discountValue, // Always set explicitly, even if 0
      isActive: isActive !== undefined ? isActive : true,
    };

    const newCode = await Code.create(codeData);

    // Convert to plain object - toObject() will apply the transform
    const codeResponse = newCode.toObject();
    // Double-check: ALWAYS set discount - never let it be undefined
    if (codeResponse.discount === undefined || codeResponse.discount === null) {
      codeResponse.discount = discountValue;
    }

    res.status(201).json({
      message: "Code created successfully",
      code: codeResponse,
    });
  } catch (error) {
    console.error("Create code error:", error);
    setCorsHeaders(res);
    return res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to create code",
      },
    });
  }
};

// GET /codes - Get all codes (with optional filters)
exports.getAllCodes = async (req, res, next) => {
  setCorsHeaders(res);

  try {
    const { isActive, search, page = 1, limit = 100 } = req.query;

    // Build query
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    if (search) {
      query.code = { $regex: search, $options: "i" };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const codes = await Code.find(query)
      .populate("usedBy", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean() to get plain objects

    // Ensure discount field is ALWAYS included (lean() returns plain objects)
    const codesWithDiscount = codes.map(code => {
      const codeObj = { ...code };
      // ALWAYS include discount - default to 0 if missing
      if (codeObj.discount === undefined || codeObj.discount === null || isNaN(codeObj.discount)) {
        codeObj.discount = 0;
      }
      return codeObj;
    });

    const total = await Code.countDocuments(query);

    res.status(200).json({
      message: "Codes retrieved successfully",
      codes: codesWithDiscount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all codes error:", error);
    setCorsHeaders(res);
    return res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to retrieve codes",
      },
    });
  }
};

// GET /codes/:id - Get a single code by ID
exports.getCodeById = async (req, res, next) => {
  setCorsHeaders(res);

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Invalid code ID format",
        },
      });
    }

    const code = await Code.findById(id).populate("usedBy", "username email").lean();

    if (!code) {
      return res.status(404).json({
        error: {
          code: "404",
          message: "Code not found",
        },
      });
    }

    // Ensure discount is ALWAYS included
    const codeWithDiscount = { ...code };
    if (codeWithDiscount.discount === undefined || codeWithDiscount.discount === null || isNaN(codeWithDiscount.discount)) {
      codeWithDiscount.discount = 0;
    }

    res.status(200).json({
      message: "Code retrieved successfully",
      code: codeWithDiscount,
    });
  } catch (error) {
    console.error("Get code by ID error:", error);
    setCorsHeaders(res);
    return res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to retrieve code",
      },
    });
  }
};

// GET /codes/code/:code - Get a code by code string
exports.getCodeByCode = async (req, res, next) => {
  setCorsHeaders(res);

  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Code parameter is required",
        },
      });
    }

    const codeDoc = await Code.findOne({ code: code.trim() })
      .populate("usedBy", "username email")
      .lean();

    if (!codeDoc) {
      return res.status(404).json({
        error: {
          code: "404",
          message: "Code not found",
        },
      });
    }

    // Ensure discount is ALWAYS included
    const codeWithDiscount = { ...codeDoc };
    if (codeWithDiscount.discount === undefined || codeWithDiscount.discount === null || isNaN(codeWithDiscount.discount)) {
      codeWithDiscount.discount = 0;
    }

    res.status(200).json({
      message: "Code retrieved successfully",
      code: codeWithDiscount,
    });
  } catch (error) {
    console.error("Get code by code string error:", error);
    setCorsHeaders(res);
    return res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to retrieve code",
      },
    });
  }
};

// PUT /codes/:id - Update a code
exports.updateCode = async (req, res, next) => {
  setCorsHeaders(res);

  try {
    const { id } = req.params;
    const { code, description, discount, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Invalid code ID format",
        },
      });
    }

    // Build update object
    const updateData = {};
    if (code !== undefined) {
      // Check if new code already exists (excluding current code)
      const existingCode = await Code.findOne({
        code: code.trim(),
        _id: { $ne: id },
      });
      if (existingCode) {
        return res.status(409).json({
          error: {
            code: "409",
            message: "Code already exists",
          },
        });
      }
      updateData.code = code.trim();
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (discount !== undefined) {
      // Validate discount
      if (typeof discount !== "number" || discount < 0 || discount > 100) {
        return res.status(400).json({
          error: {
            code: "400",
            message: "Discount must be a number between 0 and 100",
          },
        });
      }
      updateData.discount = discount;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const updatedCode = await Code.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("usedBy", "username email")
      .lean();

    if (!updatedCode) {
      return res.status(404).json({
        error: {
          code: "404",
          message: "Code not found",
        },
      });
    }

    // Ensure discount is ALWAYS included
    const codeWithDiscount = { ...updatedCode };
    if (codeWithDiscount.discount === undefined || codeWithDiscount.discount === null || isNaN(codeWithDiscount.discount)) {
      codeWithDiscount.discount = 0;
    }

    res.status(200).json({
      message: "Code updated successfully",
      code: codeWithDiscount,
    });
  } catch (error) {
    console.error("Update code error:", error);
    setCorsHeaders(res);
    return res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to update code",
      },
    });
  }
};

// DELETE /codes/:id - Delete a code
exports.deleteCode = async (req, res, next) => {
  setCorsHeaders(res);

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Invalid code ID format",
        },
      });
    }

    const deletedCode = await Code.findByIdAndDelete(id);

    if (!deletedCode) {
      return res.status(404).json({
        error: {
          code: "404",
          message: "Code not found",
        },
      });
    }

    res.status(200).json({
      message: "Code deleted successfully",
      code: deletedCode,
    });
  } catch (error) {
    console.error("Delete code error:", error);
    setCorsHeaders(res);
    return res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to delete code",
      },
    });
  }
};

// POST /codes/bulk - Create multiple codes at once
exports.createBulkCodes = async (req, res, next) => {
  setCorsHeaders(res);

  try {
    const { codes } = req.body; // Array of { code, description, isActive }

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Codes array is required and must not be empty",
        },
      });
    }

    // Validate and prepare codes
    const codesToInsert = [];
    const errors = [];

    for (let i = 0; i < codes.length; i++) {
      const { code, description, discount, isActive } = codes[i];

      if (!code) {
        errors.push(`Code at index ${i} is missing the code field`);
        continue;
      }

      // Validate discount if provided
      if (discount !== undefined) {
        if (typeof discount !== "number" || discount < 0 || discount > 100) {
          errors.push(`Code at index ${i} has invalid discount (must be 0-100)`);
          continue;
        }
      }

      // Check for duplicates in the array
      const duplicateInArray = codesToInsert.find(
        (c) => c.code === code.trim()
      );
      if (duplicateInArray) {
        errors.push(`Duplicate code "${code}" at index ${i}`);
        continue;
      }

      codesToInsert.push({
        code: code.trim(),
        description: description || "",
        discount: discount !== undefined ? discount : 0,
        isActive: isActive !== undefined ? isActive : true,
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Validation errors",
          errors,
        },
      });
    }

    // Check for existing codes in database
    const existingCodes = await Code.find({
      code: { $in: codesToInsert.map((c) => c.code) },
    });

    if (existingCodes.length > 0) {
      return res.status(409).json({
        error: {
          code: "409",
          message: "Some codes already exist",
          existingCodes: existingCodes.map((c) => c.code),
        },
      });
    }

    // Insert all codes
    const createdCodes = await Code.insertMany(codesToInsert);

    res.status(201).json({
      message: `${createdCodes.length} codes created successfully`,
      codes: createdCodes,
      count: createdCodes.length,
    });
  } catch (error) {
    console.error("Create bulk codes error:", error);
    setCorsHeaders(res);
    return res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to create codes",
      },
    });
  }
};

