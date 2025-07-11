
const express = require('express');
const router = express.Router();
const Flow = require('../models/Flow');
const User = require('../models/User');
const Package = require('../models/packages');
const Transaction = require('../models/transaction');
const FormResponse = require('../models/FormResponse');
const Interaction = require('../models/Interaction');
const Collaborator = require('../models/Collaborator'); // Add Collaborator model

// Save a new flow
// routes/flow.js



module.exports = router;

// Create a new flow

// Helper function to check if user is owner or collaborator
router.get('/statistics/:flowId', async (req, res) => {
  try {
    const { flowId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneDayAgo = new Date(today);
    oneDayAgo.setDate(today.getDate() - 1);
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    const stats = await Interaction.aggregate([
      { $match: { flowId } },
      {
        $group: {
          _id: '$country',
          daily: {
            $addToSet: {
              $cond: [{ $gte: ['$timestamp', oneDayAgo] }, '$ipAddress', null],
            },
          },
          weekly: {
            $addToSet: {
              $cond: [{ $gte: ['$timestamp', oneWeekAgo] }, '$ipAddress', null],
            },
          },
          monthly: {
            $addToSet: {
              $cond: [{ $gte: ['$timestamp', oneMonthAgo] }, '$ipAddress', null],
            },
          },
          yearly: {
            $addToSet: {
              $cond: [{ $gte: ['$timestamp', oneYearAgo] }, '$ipAddress', null],
            },
          },
          allTime: { $addToSet: '$ipAddress' },
        },
      },
      {
        $project: {
          country: '$_id',
          daily: { $size: { $filter: { input: '$daily', cond: { $ne: ['$$this', null] } } } },
          weekly: { $size: { $filter: { input: '$weekly', cond: { $ne: ['$$this', null] } } } },
          monthly: { $size: { $filter: { input: '$monthly', cond: { $ne: ['$$this', null] } } } },
          yearly: { $size: { $filter: { input: '$yearly', cond: { $ne: ['$$this', null] } } } },
          allTime: { $size: { $filter: { input: '$allTime', cond: { $ne: ['$$this', null] } } } },
          _id: 0,
        },
      },
    ]);

    const result = {
      byCountry: stats,
      totals: {
        daily: stats.reduce((sum, stat) => sum + stat.daily, 0),
        weekly: stats.reduce((sum, stat) => sum + stat.weekly, 0),
        monthly: stats.reduce((sum, stat) => sum + stat.monthly, 0),
        yearly: stats.reduce((sum, stat) => sum + stat.yearly, 0),
        allTime: stats.reduce((sum, stat) => sum + stat.allTime, 0),
      },
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('[Statistics] Error fetching stats:', error.message);
    res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
  }
});

// Form response endpoints (unchanged)
router.get('/response/detail/:responseId', async (req, res) => {
  const { responseId } = req.params;
  console.log('[Backend] Fetching form response details for responseId:', responseId);

  try {
    if (!responseId) {
      return res.status(400).json({ message: 'Invalid responseId' });
    }

    const response = await FormResponse.findById(responseId);
    if (!response) {
      return res.status(404).json({ message: `No response found for responseId: ${responseId}` });
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching form response details:', error);
    res.status(500).json({ message: 'Failed to fetch response details', error: error.message });
  }
});

router.get('/response/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    const formResponses = await FormResponse.aggregate([
      {
        $match: {
          userId: userId,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$submitDate' } } },
          responses: {
            $push: {
              _id: '$_id',
              userEmail: '$userEmail',
              formName: '$formName',
              submitDate: '$submitDate',
              response: '$response',
            },
          },
        },
      },
      { $sort: { _id: -1 } },
      { $project: { date: '$_id', responses: 1, _id: 0 } },
    ]);

    
    if (!formResponses.length) {
      return res.status(404).json({ message: `No responses found for userId: ${userId}` });
    }

    res.json(formResponses);
  } catch (error) {
    console.error('Error fetching form responses:', error);
    res.status(500).json({ message: 'Failed to fetch responses', error: error.message });
  }
});
const checkFlowAccess = async (userId, flowId) => {
  const flow = await Flow.findOne({ _id: flowId, userId });
  if (flow) return { hasAccess: true, isOwner: true };

  const collaborator = await Collaborator.findOne({ flowId, userId });
  if (collaborator) return { hasAccess: true, isOwner: false, role: collaborator.role };

  return { hasAccess: false };
};


// Add new endpoint to check invite permission
router.get('/get/:userId/:flowId', async (req, res) => {
  const { userId, flowId } = req.params;

  try {
    const access = await checkFlowAccess(userId, flowId);

    if (!access.hasAccess) {
      return res.json({ allowed: false }); // Not allowed at all
    }

    // If not owner and not admin
    if (!access.isOwner && access.role !== 'admin') {
      return res.json({ allowed: false }); // Not allowed to invite
    }

    // Passed all checks
    return res.json({ allowed: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ allowed: false, error: 'Internal Server Error' });
  }
});


// Create Flow
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { nodes, edges, flowName, websiteDomain } = req.body;
    let name = flowName || `Flow ${new Date().toLocaleString()}`;

    // Check if name exists for this user
    const existingFlow = await Flow.findOne({ userId, name });
    if (existingFlow) {
      name = `${name} (${Date.now()})`;
    }

    // Find the most recent completed transaction for the user
    const transaction = await Transaction.findOne({ userId })
      .sort({ createdAt: -1 })
      .exec();

    if (!transaction) {
      return res.status(400).json({ message: 'No active subscription found. Please purchase a package.' });
    }

    // Get the package associated with the transaction
    const pkg = await Package.findOne({ packageId: transaction.packageId });
    if (!pkg) {
      return res.status(400).json({ message: 'Associated package not found.' });
    }

    // Count the user's existing flows
    const flowCount = await Flow.countDocuments({ userId });
    if (flowCount >= pkg.flowsAllowed) {
      return res.status(403).json({
        message: `Flow limit reached. Your package allows ${pkg.flowsAllowed} flows.`,
      });
    }

    // Create the new flow
    const flow = new Flow({
      userId,
      name,
      websiteDomain,
      nodes,
      edges,
    });

    const savedFlow = await flow.save();
    res.status(201).json(savedFlow);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A flow already exists for this website domain or flow name.' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update Flow
router.put('/:userId/:flowId', async (req, res) => {
  try {
    const { userId, flowId } = req.params;
    const { nodes, edges, flowName, websiteDomain } = req.body;

    // Check if user has access (owner or collaborator)
    const access = await checkFlowAccess(userId, flowId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'You do not have permission to edit this flow' });
    }

    // If collaborator, ensure they have 'admin' role to update
    // if (!access.isOwner && access.role !== 'admin') {
    //   return res.status(403).json({ message: 'Only admins or flow owners can update flows' });
    // }

    // Check if name is being changed and if it conflicts
    if (flowName) {
      const existingWithName = await Flow.findOne({
        userId: access.isOwner ? userId : (await Flow.findById(flowId)).userId,
        name: flowName,
        _id: { $ne: flowId },
      });
      if (existingWithName) {
        return res.status(400).json({ message: 'Another flow already has this name' });
      }
    }

    const flow = await Flow.findOneAndUpdate(
      { _id: flowId },
      { nodes, edges, websiteDomain, name: flowName || (await Flow.findById(flowId)).name },
      { new: true }
    );

    if (!flow) {
      return res.status(404).json({ message: 'Flow not found' });
    }

    res.json(flow);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A flow already exists for this website domain.' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get all flows for a user (including those they collaborate on)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get flows where user is the owner
    const ownedFlows = await Flow.find({ userId })
      .sort({ updatedAt: -1 })
      .select('name updatedAt nodes edges websiteDomain');

    // Get flows where user is a collaborator
    const collaboratorFlows = await Collaborator.find({ userId })
      .select('flowId')
      .then(collaborators => {
        const flowIds = collaborators.map(c => c.flowId);
        return Flow.find({ _id: { $in: flowIds } })
          .sort({ updatedAt: -1 })
          .select('name updatedAt nodes edges websiteDomain');
      });

    // Combine and format flows
    const allFlows = [...ownedFlows, ...collaboratorFlows].map(flow => ({
      _id: flow._id,
      name: flow.name,
      websiteDomain: flow.websiteDomain,
      updatedAt: flow.updatedAt,
      nodesCount: flow.nodes?.length || 0,
      edgesCount: flow.edges?.length || 0,
    }));

    // Remove duplicates (in case a user is both owner and collaborator)
    const uniqueFlows = Array.from(new Map(allFlows.map(flow => [flow._id.toString(), flow])).values());

    res.json(uniqueFlows);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get flows',
      error: error.message,
    });
  }
});

// Get a specific flow
router.get('/:userId/:flowId', async (req, res) => {
  try {
    const { userId, flowId } = req.params;

    // Check if user has access (owner or collaborator)
    const access = await checkFlowAccess(userId, flowId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'You do not have permission to view this flow' });
    }

    const flow = await Flow.findOne({
      _id: flowId,
    });

    if (!flow) {
      console.error('Flow not found');
      return res.status(404).json({ message: 'Flow not found' });
    }

    res.json({
      nodes: flow.nodes,
      edges: flow.edges,
      flowName: flow.name,
      websiteDomain: flow.websiteDomain,
    });
  } catch (error) {
    console.error('Error fetching flow:', error);
    res.status(500).json({ message: 'Failed to fetch flow', error: error.message });
  }
});

// Delete Flow (restrict to owners or admins)
router.delete('/:userId/:flowId', async (req, res) => {
  try {
    const { userId, flowId } = req.params;

    // Check if user has access (owner or collaborator)
    const access = await checkFlowAccess(userId, flowId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'You do not have permission to delete this flow' });
    }

    // Only allow owners or admins to delete
    if (!access.isOwner && access.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins or flow owners can delete flows' });
    }

    const deleted = await Flow.findOneAndDelete({
      _id: flowId,
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Flow not found' });
    }

    // Optionally, clean up collaborators for this flow
    await Collaborator.deleteMany({ flowId });

    res.json({
      message: 'Flow deleted successfully',
      deletedId: flowId,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete flow',
      error: error.message,
    });
  }
});

// Check flow name availability
router.get('/check-name', async (req, res) => {
  try {
    const { userId, name } = req.query;
    if (!userId || !name) {
      return res.status(400).json({
        message: 'userId and name parameters are required',
      });
    }

    const exists = await Flow.exists({
      userId,
      name: name.trim(),
    });

    res.json({
      available: !exists,
      suggestedName: exists ? `${name.trim()} (${Date.now()})` : null,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to check name availability',
      error: error.message,
    });
  }
});

// Statistics endpoint (unchanged)


module.exports = router;