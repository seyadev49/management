const db = require('../db/connection');
const { sendAdminNotificationEmail } = require('../services/emailService');

const createProperty = async (req, res) => {
  try {
    const {
      name,
      type,
      address,
      city,
      subcity,
      woreda,
      description,
      amenities,
    } = req.body;

    // Create property
    const [propertyResult] = await db.execute(
      `INSERT INTO properties (organization_id, landlord_id, name, type, address, city, subcity, woreda, description, total_units, amenities) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        req.user.organization_id,
        req.user.id,
        name,
        type,
        address,
        city,
        subcity,
        woreda,
        description,
        JSON.stringify(amenities || [])
      ]
    );

    // Send notification to organization admins about new property
    try {
      const [adminUsers] = await db.execute(
        `SELECT u.email, u.full_name, o.name as organization_name
         FROM users u 
         JOIN organizations o ON u.organization_id = o.id 
         WHERE u.organization_id = ? AND u.role IN ('landlord', 'admin') AND u.is_active = TRUE`,
        [req.user.organization_id]
      );

      for (const admin of adminUsers) {
        if (admin.email !== req.user.email) { // Don't send to the user who created the property
          await sendAdminNotificationEmail(
            admin.email,
            admin.full_name,
            'New Property Added',
            `A new property "${name}" (${type}) has been added at ${address}, ${city} by ${req.user.full_name}.`,
            admin.organization_name
          );
        }
      }
    } catch (emailError) {
      console.error('Failed to send property creation notification:', emailError);
    }


    res.status(201).json({
      message: 'Property created successfully',
      propertyId: propertyResult.insertId
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProperties = async (req, res) => {
  try {
    const [properties] = await db.execute(
      `SELECT p.*, 
              COUNT(pu.id) AS total_units,
              SUM(CASE WHEN pu.is_occupied = TRUE THEN 1 ELSE 0 END) AS occupied_units,
              SUM(CASE WHEN pu.is_occupied = FALSE THEN 1 ELSE 0 END) AS vacant_units
       FROM properties p
       LEFT JOIN property_units pu ON p.id = pu.property_id AND pu.is_active = TRUE
       WHERE p.organization_id = ? AND p.is_active = TRUE
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.user.organization_id]
    );

    res.json({ properties });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
console.log(id, req.user.organization_id);
    const [properties] = await db.execute(
      'SELECT * FROM properties WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );

    if (properties.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

const [units] = await db.execute(
  `
  SELECT pu.*, 
         CASE WHEN rc.id IS NOT NULL THEN TRUE ELSE FALSE END as is_occupied
  FROM property_units pu
  LEFT JOIN rental_contracts rc ON pu.id = rc.unit_id AND rc.status = 'active'
  WHERE pu.property_id = ? AND pu.is_active = TRUE 
  ORDER BY pu.unit_number
  `,
  [id]
);

    const property = properties[0];
    property.units = units;
//console log unirts
    console.log('Units:', units);
    res.json({ property });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      address,
      city,
      subcity,
      woreda,
      description,
      amenities
    } = req.body;

    await db.execute(
      `UPDATE properties 
       SET name = ?, type = ?, address = ?, city = ?, subcity = ?, woreda = ?, description = ?, amenities = ?
       WHERE id = ? AND organization_id = ?`,
      [name, type, address, city, subcity, woreda, description, JSON.stringify(amenities || []), id, req.user.organization_id]
    );

    res.json({ message: 'Property updated successfully' });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      'UPDATE properties SET is_active = FALSE WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty
};