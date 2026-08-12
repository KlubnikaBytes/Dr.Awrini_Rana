const Service = require('../models/Service');

exports.getServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching services', error: error.message });
  }
};

exports.createService = async (req, res) => {
  try {
    const { code, serviceId, serviceName } = req.body;
    if (code && serviceId && code === serviceId) {
      return res.status(400).json({ message: 'Service ID and CODE must be different' });
    }
    const existingName = await Service.findOne({ serviceName });
    if (existingName) return res.status(400).json({ message: 'Service Name must be unique' });
    
    if (code) {
      const existingCode = await Service.findOne({ code });
      if (existingCode) return res.status(400).json({ message: 'CODE must be unique across services' });
    }
    if (serviceId) {
      const existingId = await Service.findOne({ serviceId });
      if (existingId) return res.status(400).json({ message: 'Service ID must be unique across services' });
    }

    const newService = new Service(req.body);
    const savedService = await newService.save();
    res.status(201).json(savedService);
  } catch (error) {
    res.status(500).json({ message: 'Error creating service', error: error.message });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, serviceId, serviceName } = req.body;
    if (code && serviceId && code === serviceId) {
      return res.status(400).json({ message: 'Service ID and CODE must be different' });
    }
    if (serviceName) {
      const existingName = await Service.findOne({ serviceName, _id: { $ne: id } });
      if (existingName) return res.status(400).json({ message: 'Service Name must be unique' });
    }
    if (code) {
      const existingCode = await Service.findOne({ code, _id: { $ne: id } });
      if (existingCode) return res.status(400).json({ message: 'CODE must be unique across services' });
    }
    if (serviceId) {
      const existingId = await Service.findOne({ serviceId, _id: { $ne: id } });
      if (existingId) return res.status(400).json({ message: 'Service ID must be unique across services' });
    }

    const updatedService = await Service.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedService) return res.status(404).json({ message: 'Service not found' });
    res.json(updatedService);
  } catch (error) {
    res.status(500).json({ message: 'Error updating service', error: error.message });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedService = await Service.findByIdAndDelete(id);
    if (!deletedService) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting service', error: error.message });
  }
};
