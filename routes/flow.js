// routes/flow.js
const express = require('express');
const router = express.Router();
const Flow = require('../models/Flow');
const Collaborator = require('../models/Collaborator');
const User = require('../models/User');
const Package = require('../models/packages');
const Transaction = require('../models/transaction');
const FormResponse = require('../models/FormResponse');
const Interaction = require('../models/Interaction');
const jwt = require('jsonwebtoken');

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId };
    const user = await User.findById(decoded.userId);
    if (!user || !user.isVerified || !user.active) {
      return res.status(403).json({ message: 'User is not verified or active' });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Check flow permission
const checkFlowPermission = async (req, res, next) => {
  const { userId } = req.user;
  const { flowId } = req.params;

  const flow = await Flow.findOne({ _id: flowId });
  if (!flow) {
    return res.status(404).json({ message: 'Flow not found' });
  }

  const isOwner = flow.userId === userId;
  const collaborator = await Collaborator.findOne({ flowId, userId });
  if (!isOwner && !collaborator) {
    return res.status(403).json({ message: 'Unauthorized to access this flow' });
  }

  req.flowRole = isOwner ? 'owner' : collaborator.role;
  req.flow = flow;
  next();
};

// Create Flow
router.post('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { nodes, edges, flowName, websiteDomain } = req.body;
    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to create flow for this user' });
    }

    let name = flowName || `Flow ${new Date().toLocaleString()}`;
    const existingFlow = await Flow.findOne({ userId, name });
    if (existingFlow) {
      name = `${name} (${Date.now()})`;
    }

    const transaction = await Transaction.findOne({ userId }).sort({ createdAt: -1 });
    if (!transaction) {
      return res.status(400).json({ message: 'No active subscription found. Please purchase a package.' });
    }

    const pkg = await Package.findOne({ packageId: transaction.packageId });
    if (!pkg) {
      return res.status(400).json({ message: 'Associated package not found.' });
    }

    const flowCount = await Flow.countDocuments({ userId });
    if (flowCount >= pkg.flowsAllowed) {
      return res.status(403).json({ message: `Flow limit reached. Your package allows ${pkg.flowsAllowed} flows.` });
    }

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

// Update Flow (consolidate duplicate routes)
router.put('/:userId/:flowId', authMiddleware, checkFlowPermission, async (req, res) => {
  try {
    const { userId, flowId } = req.params;
    const { nodes, edges, flowName, websiteDomain } = req.body;
    const role = req.flowRole;

    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to update this flow' });
    }

    const updateData = {};
    if (nodes) updateData.nodes = nodes;
    if (edges) updateData.edges = edges;

    // Only owners and admins can update name and websiteDomain
    if (role === 'owner' || role === 'admin') {
      if (flowName) {
        const existingWithName = await Flow.findOne({
          userId,
          name: flowName,
          _id: { $ne: flowId },
        });
        if (existingWithName) {
          return res.status(400).json({ message: 'Another flow already has this name' });
        }
        updateData.name = flowName;
      }
      if (websiteDomain) updateData.websiteDomain = websiteDomain;
    }

    const updatedFlow = await Flow.findOneAndUpdate(
      { _id: flowId, userId: req.flow.userId }, // Ensure flow belongs to owner
      { $set: updateData },
      { new: true }
    );

    if (!updatedFlow) {
      return res.status(404).json({ message: 'Flow not found' });
    }

    res.json(updatedFlow);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A flow already exists for this website domain.' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Delete Flow (only owner)
router.delete('/:userId/:flowId', authMiddleware, async (req, res) => {
  try {
    const { userId, flowId } = req.params;
    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this flow' });
    }

    const flow = await Flow.findOne({ _id: flowId, userId });
    if (!flow) {
      return res.status(404).json({ message: 'Flow not found' });
    }

    await Flow.deleteOne({ _id: flowId, userId });
    await Collaborator.deleteMany({ flowId }); // Remove all collaborators
    await Invite.deleteMany({ flowId }); // Remove all invites

    res.json({ message: 'Flow deleted successfully', deletedId: flowId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete flow', error: error.message });
  }
});

// Get All Flows for User (including collaborator flows)
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to access flows' });
    }

    const flows = await Flow.find({ userId }).select('name websiteDomain updatedAt nodes edges');
    const collaboratorFlows = await Collaborator.find({ userId })
      .populate('flowId', 'name websiteDomain updatedAt nodes edges')
      .lean();

    const formattedFlows = [
      ...flows.map((flow) => ({
        _id: flow._id,
        name: flow.name,
        websiteDomain: flow.websiteDomain,
        updatedAt: flow.updatedAt,
        nodesCount: flow.nodes?.length || 0,
        edgesCount: flow.edges?.length || 0,
        role: 'owner',
      })),
      ...collaboratorFlows.map((collab) => ({
        _id: collab.flowId._id,
        name: collab.flowId.name,
        websiteDomain: collab.flowId.websiteDomain,
        updatedAt: collab.flowId.updatedAt,
        nodesCount: collab.flowId.nodes?.length || 0,
        edgesCount: collab.flowId.edges?.length || 0,
        role: collab.role,
      })),
    ];

    res.json(formattedFlows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get flows', error: error.message });
  }
});

// Get Single Flow
router.get('/:userId/:flowId', authMiddleware, checkFlowPermission, async (req, res) => {
  try {
    const { userId, flowId } = req.params;
    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to access this flow' });
    }

    res.json({
      nodes: req.flow.nodes,
      edges: req.flow.edges,
      flowName: req.flow.name,
      websiteDomain: req.flow.websiteDomain,
      role: req.flowRole, // Include user’s role for frontend
    });
  } catch (error) {
    console.error('Error fetching flow:', error);
    res.status(500).json({ message: 'Failed to fetch flow', error: error.message });
  }
});

// Check Flow Name
router.get('/check-name', authMiddleware, async (req, res) => {
  try {
    const { userId, name } = req.query;
    if (!userId || !name) {
      return res.status(400).json({ message: 'userId and name parameters are required' });
    }
    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to check name for this user' });
    }

    const exists = await Flow.exists({ userId, name: name.trim() });
    res.json({
      available: !exists,
      suggestedName: exists ? `${name.trim()} (${Date.now()})` : null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check name availability', error: error.message });
  }
});

// Statistics (add permission check)
router.get('/statistics/:flowId', authMiddleware, checkFlowPermission, async (req, res) => {
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

// Form Response Routes (unchanged, but add auth if needed)
router.get('/response/detail/:responseId', authMiddleware, async (req, res) => {
  const { responseId } = req.params;
  try {
    if (!responseId) {
      return res.status(400).json({ message: 'Invalid responseId' });
    }

    const response = await FormResponse.findById(responseId);
    if (!response) {
      return res.status(404).json({ message: `No response found for responseId: ${responseId}` });
    }

    // Check if user has access to this response
    const flow = await Flow.findOne({ _id: response.flowId });
    if (!flow) {
      return res.status(404).json({ message: 'Associated flow not found' });
    }
    const isOwner = flow.userId === req.user.userId;
    const isCollaborator = await Collaborator.exists({ flowId: response.flowId, userId: req.user.userId });
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Unauthorized to access this response' });
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching form response details:', error);
    res.status(500).json({ message: 'Failed to fetch response details', error: error.message });
  }
});

router.get('/response/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  try {
    if (!userId || req.user.userId !== userId) {
      return res.status(400).json({ message: 'Invalid or unauthorized userId' });
    }

    const formResponses = await FormResponse.aggregate([
      { $match: { userId } },
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

module.exports = router;


// const express = require('express');
// const router = express.Router();
// const Flow = require('../models/Flow');
// const User = require('../models/User');
// const Package = require('../models/packages');
// const Transaction = require('../models/transaction');
// const FormResponse = require('../models/FormResponse');
// const Interaction = require('../models/Interaction');

// // Save a new flow
// // routes/flow.js

// // Create Flow
// router.get('/statistics/:flowId', async (req, res) => {
//   try {
//     const { flowId } = req.params;
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     // Define date ranges
//     const oneDayAgo = new Date(today);
//     oneDayAgo.setDate(today.getDate() - 1);
//     const oneWeekAgo = new Date(today);
//     oneWeekAgo.setDate(today.getDate() - 7);
//     const oneMonthAgo = new Date(today);
//     oneMonthAgo.setMonth(today.getMonth() - 1);
//     const oneYearAgo = new Date(today);
//     oneYearAgo.setFullYear(today.getFullYear() - 1);

//     // MongoDB aggregation pipeline
//     const stats = await Interaction.aggregate([
//       // Match interactions for the given flowId
//       { $match: { flowId } },
//       // Group by country and time periods
//       {
//         $group: {
//           _id: '$country', // Group by country (null for interactions without country)
//           daily: {
//             $addToSet: {
//               $cond: [
//                 { $gte: ['$timestamp', oneDayAgo] },
//                 '$ipAddress',
//                 null,
//               ],
//             },
//           },
//           weekly: {
//             $addToSet: {
//               $cond: [
//                 { $gte: ['$timestamp', oneWeekAgo] },
//                 '$ipAddress',
//                 null,
//               ],
//             },
//           },
//           monthly: {
//             $addToSet: {
//               $cond: [
//                 { $gte: ['$timestamp', oneMonthAgo] },
//                 '$ipAddress',
//                 null,
//               ],
//             },
//           },
//           yearly: {
//             $addToSet: {
//               $cond: [
//                 { $gte: ['$timestamp', oneYearAgo] },
//                 '$ipAddress',
//                 null,
//               ],
//             },
//           },
//           allTime: { $addToSet: '$ipAddress' },
//         },
//       },
//       // Project to count unique interactions per country
//       {
//         $project: {
//           country: '$_id',
//           daily: { $size: { $filter: { input: '$daily', cond: { $ne: ['$$this', null] } } } },
//           weekly: { $size: { $filter: { input: '$weekly', cond: { $ne: ['$$this', null] } } } },
//           monthly: { $size: { $filter: { input: '$monthly', cond: { $ne: ['$$this', null] } } } },
//           yearly: { $size: { $filter: { input: '$yearly', cond: { $ne: ['$$this', null] } } } },
//           allTime: { $size: { $filter: { input: '$allTime', cond: { $ne: ['$$this', null] } } } },
//           _id: 0, // Exclude _id field
//         },
//       },
//     ]);

//     // Format response to include country breakdown and totals
//     const result = {
//       byCountry: stats, // Array of { country, daily, weekly, monthly, yearly, allTime }
//       totals: {
//         daily: stats.reduce((sum, stat) => sum + stat.daily, 0),
//         weekly: stats.reduce((sum, stat) => sum + stat.weekly, 0),
//         monthly: stats.reduce((sum, stat) => sum + stat.monthly, 0),
//         yearly: stats.reduce((sum, stat) => sum + stat.yearly, 0),
//         allTime: stats.reduce((sum, stat) => sum + stat.allTime, 0),
//       },
//     };

//     // Return stats (default to empty array and zero totals if no results)
//     res.status(200).json(result);
//   } catch (error) {
//     console.error('[Statistics] Error fetching stats:', error.message);
//     res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
//   }
// });
// router.get('/response/detail/:responseId', async (req, res) => {
//   const { responseId } = req.params;
//   console.log('[Backend] Fetching form response details for responseId:', responseId);

//   try {
//     if (!responseId) {
//       return res.status(400).json({ message: 'Invalid responseId' });
//     }

//     const response = await FormResponse.findById(responseId);
//     if (!response) {
//       return res.status(404).json({ message: `No response found for responseId: ${responseId}` });
//     }

//     res.json(response);
//   } catch (error) {
//     console.error('Error fetching form response details:', error);
//     res.status(500).json({ message: 'Failed to fetch response details', error: error.message });
//   }
// });
// router.get('/response/:userId', async (req, res) => {
//   const { userId } = req.params;

//   try {
//     if (!userId) {
//       return res.status(400).json({ message: 'Invalid userId' });
//     }

//     const formResponses = await FormResponse.aggregate([
//       {
//         $match: {
//           userId: userId // Match only on userId
//         }
//       },
//       {
//         $group: {
//           _id: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$submitDate' } } }, // Convert string to date
//           responses: {
//             $push: {
//               _id: '$_id',
//               userEmail: '$userEmail',
//               formName: '$formName',
//               submitDate: '$submitDate',
//               response: '$response'
//             }
//           }
//         }
//       },
//       { $sort: { _id: -1 } },
//       { $project: { date: '$_id', responses: 1, _id: 0 } }
//     ]);

//     if (!formResponses.length) {
//       return res.status(404).json({ message: `No responses found for userId: ${userId}` });
//     }

//     res.json(formResponses);
//   } catch (error) {
//     console.error('Error fetching form responses:', error);
//     res.status(500).json({ message: 'Failed to fetch responses', error: error.message });
//   }
// });

// module.exports = router;

// // Create a new flow
// router.post('/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { nodes, edges, flowName, websiteDomain } = req.body;
//     let name = flowName || `Flow ${new Date().toLocaleString()}`;

//     // Check if name exists for this user
//     const existingFlow = await Flow.findOne({ userId, name });
//     if (existingFlow) {
//       // Append timestamp to make it unique
//       name = `${name} (${Date.now()})`;
//     }

//     // Find the most recent completed transaction for the user
//     const transaction = await Transaction.findOne({
//       userId,
//       // status: 'completed',
//     })
//       .sort({ createdAt: -1 }) // Get the most recent completed transaction
//       .exec();

//     if (!transaction) {
//       return res.status(400).json({ message: 'No active subscription found. Please purchase a package.' });
//     }

//     // Get the package associated with the transaction
//     const pkg = await Package.findOne({ packageId: transaction.packageId });
//     if (!pkg) {
//       return res.status(400).json({ message: 'Associated package not found.' });
//     }

//     // Count the user's existing flows
//     const flowCount = await Flow.countDocuments({ userId });
//     if (flowCount >= pkg.flowsAllowed) {
//       return res.status(403).json({
//         message: `Flow limit reached. Your package allows ${pkg.flowsAllowed} flows.`,
//       });
//     }

//     // Create the new flow
//     const flow = new Flow({
//       userId,
//       name,
//       websiteDomain,
//       nodes,
//       edges,
//     });

//     const savedFlow = await flow.save();
//     res.status(201).json(savedFlow);
//   } catch (error) {
//     if (error.code === 11000) {
//       return res.status(400).json({ message: 'A flow already exists for this website domain or flow name.' });
//     }
//     res.status(500).json({ message: error.message });
//   }
// });
  
//   // Update Flow
//   router.put('/:userId/:flowId', async (req, res) => {
//     try {
//       const { nodes, edges, flowName } = req.body;
      
//       // First get the current flow
//       const currentFlow = await Flow.findById(req.params.flowId);
//       if (!currentFlow) {
//         return res.status(404).json({ message: 'Flow not found' });
//       }
  
//       // Check if name is being changed and if it conflicts
//       if (flowName && flowName !== currentFlow.name) {
//         const existingWithName = await Flow.findOne({
//           userId: req.params.userId,
//           name: flowName,
//           _id: { $ne: req.params.flowId } // Exclude current flow
//         });
        
//         if (existingWithName) {
//           return res.status(400).json({
//             message: 'Another flow already has this name'
//           });
//         }
//       }
  
//       const updatedFlow = await Flow.findByIdAndUpdate(
//         req.params.flowId,
//         {
//           name: flowName || currentFlow.name,
//           nodes,
//           edges
//         },
//         { new: true }
//       );
  
//       res.json(updatedFlow);
//     } catch (error) {
//       res.status(500).json({ 
//         message: 'Failed to update flow',
//         error: error.message 
//       });
//     }
//   });
  
// router.put('/:userId/:flowId', async (req, res) => {
//   try {
//     const { userId, flowId } = req.params;
//     const { nodes, edges, websiteDomain } = req.body;

//     const flow = await Flow.findOneAndUpdate(
//       { _id: flowId, userId },
//       { nodes, edges, websiteDomain },
//       { new: true }
//     );

//     if (!flow) {
//       return res.status(404).json({ message: 'Flow not found' });
//     }

//     res.json(flow);
//   } catch (error) {
//     if (error.code === 11000) {
//       return res.status(400).json({ message: 'A flow already exists for this website domain.' });
//     }
//     res.status(500).json({ message: error.message });
//   }
// });


//  router.get('/user/:userId', async (req, res) => {
//     try {
//         const flows = await Flow.find({ userId: req.params.userId })
//         .sort({ updatedAt: -1 })
//         .select('name updatedAt nodes edges'); // get arrays
      
//       const formattedFlows = flows.map(flow => ({
//         _id: flow._id,
//         name: flow.name,
//         websiteDomain:flow.websiteDomain,
//         updatedAt: flow.updatedAt,
//         nodesCount: flow.nodes?.length || 0,
//         edgesCount: flow.edges?.length || 0
//       }));
//        // Don't return heavy data in list
//       res.json(formattedFlows);
//     } catch (error) {
//       res.status(500).json({ 
//         message: 'Failed to get flows',
//         error: error.message 
//       });
//     }
//   });

// // Get all flows for a user
// router.get('/:userId', async (req, res) => {
//   try {
//     const flows = await Flow.find({ userId: req.params.userId });
//     res.json(flows);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Get a specific flow

  
//   // Get All Flows for User
 
  
//   // Get Single Flow
// // routes/flow.js
// router.get('/:userId/:flowId', async (req, res) => {
//     try {
//       console.log(`Fetching flow for userId: ${req.params.userId}, flowId: ${req.params.flowId}`); // Debug log
//       const flow = await Flow.findOne({
//         userId: req.params.userId,
//         _id: req.params.flowId,
//       });

//       if (!flow) {
//         console.error('Flow not found');
//         return res.status(404).json({ message: 'Flow not found' });
//       }
  
//       res.json({
//         nodes: flow.nodes,
//         edges: flow.edges,
//         flowName:flow.name,
//         websiteDomain:flow.websiteDomain,
//       });
//     } catch (error) {
//       console.error('Error fetching flow:', error);
//       res.status(500).json({ message: 'Failed to fetch flow', error: error.message });
//     }
//   });
// //   router.get('/:userId/:flowId', async (req, res) => {
// //     try {
// //       const flow = await Flow.findOne({
// //         userId: req.params.userId,
// //         _id: req.params.flowId
// //       });
      
// //       if (!flow) {
// //         return res.status(404).json({ message: 'Flow not found' });
// //       }
      
// //       res.json(flow);
// //     } catch (error) {
// //       res.status(500).json({ 
// //         message: 'Failed to get flow',
// //         error: error.message 
// //       });
// //     }
// //   });
  
//   // Delete Flow
//   router.delete('/:userId/:flowId', async (req, res) => {
//     try {
//       const deleted = await Flow.findOneAndDelete({
//         userId: req.params.userId,
//         _id: req.params.flowId
//       });
      
//       if (!deleted) {
//         return res.status(404).json({ message: 'Flow not found' });
//       }
      
//       res.json({ 
//         message: 'Flow deleted successfully',
//         deletedId: req.params.flowId
//       });
//     } catch (error) {
//       res.status(500).json({ 
//         message: 'Failed to delete flow',
//         error: error.message 
//       });
//     }
//   });
//   router.get('/check-name', async (req, res) => {
//     try {
//       const { userId, name } = req.query;
//       if (!userId || !name) {
//         return res.status(400).json({ 
//           message: 'userId and name parameters are required' 
//         });
//       }
  
//       const exists = await Flow.exists({ 
//         userId, 
//         name: name.trim() 
//       });
      
//       res.json({ 
//         available: !exists,
//         suggestedName: exists ? `${name.trim()} (${Date.now()})` : null
//       });
//     } catch (error) {
//       res.status(500).json({ 
//         message: 'Failed to check name availability',
//         error: error.message 
//       });
//     }
//   });
//   router.get('/check-name', async (req, res) => {
//     try {
//       const { userId, name } = req.query;
//       if (!userId || !name) {
//         return res.status(400).json({ 
//           message: 'userId and name parameters are required' 
//         });
//       }
  
//       const exists = await Flow.exists({ 
//         userId, 
//         name: name.trim() 
//       });
      
//       res.json({ 
//         available: !exists,
//         suggestedName: exists ? `${name.trim()} (${Date.now()})` : null
//       });
//     } catch (error) {
//       res.status(500).json({ 
//         message: 'Failed to check name availability',
//         error: error.message 
//       });
//     }
//   });

//   module.exports = router;