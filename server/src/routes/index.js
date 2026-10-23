import { Router } from 'express';
import evidenceRoutes from './evidenceRoutes.js';
import resumeRoutes from './resumeRoutes.js';
import jobTargetRoutes from './jobTargetRoutes.js';
import chatRoutes from './chatRoutes.js';
import preparationAgentRoutes from './preparationAgentRoutes.js';
import planRoutes from './planRoutes.js';
import mentorRoutes from './mentorRoutes.js';
import portfolioRoutes from './portfolioRoutes.js';
import publicRoutes from './publicRoutes.js';
import adminRoutes from './adminRoutes.js';
import userRoutes from './userRoutes.js';
import authRoutes from './authRoutes.js';

const apiRoutes = Router();
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/evidence', evidenceRoutes);
apiRoutes.use('/resumes', resumeRoutes);
apiRoutes.use('/job-targets', jobTargetRoutes);
apiRoutes.use('/career-chat', chatRoutes);
apiRoutes.use('/preparation-agent', preparationAgentRoutes);
apiRoutes.use('/plans', planRoutes);
apiRoutes.use(mentorRoutes); // /mentor-invitations + /grants + /reviews + /shared + /resumes/:id
apiRoutes.use('/', portfolioRoutes); // /portfolio*, /portfolios/:slug, /abuse
apiRoutes.use('/', publicRoutes); // /role-guides
apiRoutes.use('/admin', adminRoutes);

apiRoutes.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default apiRoutes;
