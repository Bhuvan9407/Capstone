import mongoose from 'mongoose';

/** One bounded agent execution: validated tool calls only, no hidden chain-of-
 *  thought. A tool failure is recorded and the agent run is marked failed —
 *  success is never claimed over a failed tool. */
export const RUN_STATUS = ['running', 'completed', 'failed', 'timeout'];

const agentRunSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobTargetId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobTarget', index: true },
    status: { type: String, enum: RUN_STATUS, default: 'running', index: true },
    error: { type: String, maxlength: 800 },
    toolCalls: [
      {
        tool: { type: String, required: true, maxlength: 60 },
        input: { type: Object, default: {} },
        status: {
          type: String,
          enum: ['ok', 'validation_error', 'executor_error', 'timeout'],
          required: true,
        },
        ms: { type: Number, default: 0 },
        error: { type: String, maxlength: 500 },
        resultRef: { type: String, maxlength: 100 },
      },
    ],
    proposedPlan: { type: Object },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    createdDraftPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticePlan' },
  },
  { timestamps: true, collection: 'agent_runs' }
);

const AgentRun = mongoose.models.AgentRun || mongoose.model('AgentRun', agentRunSchema);
export default AgentRun;
