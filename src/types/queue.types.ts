export interface QueueJobOptions {
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  jobId?: string;
  priority?: number;
}

export interface BaseJobData {
  jobType: string;
  createdAt?: Date;
}

export interface EmailJobData extends BaseJobData {
  jobType: 'email';
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
}

export interface HistoryJobData extends BaseJobData {
  jobType: 'history';
  postId: string;
  changedFields: Record<string, any>;
  changedBy: string;
  changeReason: string;
}

export interface PublishPostJobData extends BaseJobData {
  jobType: 'publish-post';
  postId: string;
}

export type JobData = EmailJobData | HistoryJobData | PublishPostJobData;
