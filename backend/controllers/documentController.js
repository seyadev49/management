// documents.controller.js
const db = require('../db/connection');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Multer setup (same as before, but improved filename)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\/(pdf|jpeg|jpg|png|gif|doc|docx|txt|xlsx|xls)$/i;
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, images, Word, Excel, and text files are allowed'));
    }
  }
});

// Get all categories (system + custom)
const getCategories = async (req, res) => {
  try {
    const [categories] = await db.execute(
      `SELECT id, name, is_system 
       FROM document_categories 
       WHERE organization_id = ? 
       ORDER BY is_system DESC, name ASC`,
      [req.user.organization_id]
    );
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create custom category
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Category name must be at least 2 characters' });
    }

    const [result] = await db.execute(
      `INSERT INTO document_categories (organization_id, name, is_system) 
       VALUES (?, ?, FALSE)`,
      [req.user.organization_id, name.trim()]
    );

    res.status(201).json({ 
      id: result.insertId, 
      name: name.trim(), 
      is_system: false 
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload document (enhanced)
const uploadDocument = async (req, res) => {
  try {
    const { 
      entityType, 
      entityId, 
      documentName, 
      documentType,
      categoryId 
    } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate category if provided
    let validCategoryId = null;
    if (categoryId) {
      const [cats] = await db.execute(
        'SELECT id FROM document_categories WHERE id = ? AND organization_id = ?',
        [categoryId, req.user.organization_id]
      );
      if (cats.length > 0) validCategoryId = categoryId;
    }

    const [result] = await db.execute(
      `INSERT INTO documents 
       (organization_id, entity_type, entity_id, document_name, document_type, 
        file_path, file_size, uploaded_by, category_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.organization_id,
        entityType || null,
        entityId || null,
        documentName || req.file.originalname,
        documentType || req.file.mimetype,
        req.file.path,
        req.file.size,
        req.user.id,
        validCategoryId
      ]
    );

    res.status(201).json({
      message: 'Document uploaded successfully',
      documentId: result.insertId
    });
  } catch (error) {
    console.error('Upload document error:', error);
    // Clean up file on error
    if (req.file?.path) {
      try { await fs.unlink(req.file.path); } catch {}
    }
    res.status(500).json({ message: 'Upload failed. Please try again.' });
  }
};

// Get documents with filters
const getDocuments = async (req, res) => {
  try {
    const { 
      search = '', 
      categoryId = '', 
      entityType = '', 
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = req.query;

    let query = `
      SELECT d.*, u.full_name as uploaded_by_name, 
             COALESCE(c.name, 'Uncategorized') as category_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN document_categories c ON d.category_id = c.id
      WHERE d.organization_id = ? AND d.is_active = TRUE
    `;
    
    const params = [req.user.organization_id];

    if (search) {
      query += ` AND (d.document_name LIKE ? OR d.document_type LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      query += ` AND d.category_id = ?`;
      params.push(categoryId);
    }

    if (entityType) {
      query += ` AND d.entity_type = ?`;
      params.push(entityType);
    }

    // Validate sort
    const allowedSort = ['created_at', 'document_name', 'file_size'];
    const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const sortCol = allowedSort.includes(sortBy) ? sortBy : 'created_at';

    query += ` ORDER BY d.${sortCol} ${dir}`;

    const [documents] = await db.execute(query, params);
    res.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const [docs] = await db.execute(
      'SELECT file_path FROM documents WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );

    if (docs.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file
    await fs.unlink(docs[0].file_path);

    // Soft delete
    await db.execute(
      'UPDATE documents SET is_active = FALSE WHERE id = ?',
      [id]
    );

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Download document
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const [docs] = await db.execute(
      'SELECT file_path, document_name FROM documents WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );

    if (docs.length === 0 || !fs.existsSync(docs[0].file_path)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.download(docs[0].file_path, docs[0].document_name);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  upload,
  getCategories,
  createCategory,
  uploadDocument,
  getDocuments,
  deleteDocument,
  downloadDocument
};