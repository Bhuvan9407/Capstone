import Evidence from '../models/Evidence.js';
import JobTarget from '../models/JobTarget.js';
import PracticePlan from '../models/PracticePlan.js';
import Portfolio from '../models/Portfolio.js';
import Document from '../models/Document.js';

export const getMe = async (user) => {
  const [evidenceCount, targetCount, planCount, processing] = await Promise.all([
    Evidence.countDocuments({ userId: user._id }),
    JobTarget.countDocuments({ userId: user._id }),
    PracticePlan.countDocuments({ userId: user._id, status: 'confirmed' }),
    Document.find({ userId: user._id, status: { $in: ['uploaded', 'extracting', 'embedding'] } })
      .select('kind status createdAt')
      .limit(5)
      .lean(),
  ]);
  const portfolio = await Portfolio.findOne({ userId: user._id }).lean();
  return {
    ...user.safeView(),
    stats: {
      evidence: evidenceCount,
      targets: targetCount,
      confirmedPlans: planCount,
    },
    portfolioPublished: Boolean(portfolio?.isPublished),
    portfolioSet: Boolean(portfolio),
    processingDocs: processing,
  };
};
