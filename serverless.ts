/* eslint-disable no-template-curly-in-string */
import type { AWS } from '@serverless/typescript';

import {
  oauth,
  oauthCallback,
  gmailPush,
  saveEmail,
  keepPubSubAlive,
} from './src/functions';

const serverlessConfiguration: AWS = {
  service: 'weekly-newsletter-email',
  frameworkVersion: '2',
  useDotenv: true,
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true,
    },
    stages: ['local', 'dev', 'prod'],
    stage: '${opt:stage, self:provider.stage}',
    local: {
      GMAIL_NOTIFICATION_QUEUE_URL: 'http://localhost:3000',
    },
    dev: {
      GMAIL_NOTIFICATION_QUEUE_URL: {
        'Fn::Join': [
          '',
          [
            'https://sqs.',
            { Ref: 'AWS::Region' },
            '.',
            { Ref: 'AWS::URLSuffix' },
            '/',
            { Ref: 'AWS::AccountId' },
            '/',
            { 'Fn::GetAtt': ['GmailNotificationQueue', 'QueueName'] },
          ],
        ],
      },
    },
    prod: '${self:custom.dev}',
  },
  plugins: [
    'serverless-webpack',
    'serverless-offline',
    'serverless-stage-manager',
  ],
  provider: {
    name: 'aws',
    runtime: 'nodejs12.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['sqs:SendMessage'],
        Resource: { 'Fn::GetAtt': ['GmailNotificationQueue', 'Arn'] },
      },
    ],
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      OAUTH_CLIENT_ID: '${env:OAUTH_CLIENT_ID}',
      OAUTH_CLIENT_SECRET: '${env:OAUTH_CLIENT_SECRET}',
      OAUTH_REDIRECT_URI: '${env:OAUTH_REDIRECT_URI}',
      OAUTH_URI: '${env:OAUTH_URI}',
      OAUTH_TOKEN_URI: '${env:OAUTH_TOKEN_URI}',
      OAUTH_PROVIDER_X509_CERT_URL: '${env:OAUTH_PROVIDER_X509_CERT_URL}',
      MONGODB_URI: '${env:MONGODB_URI}',
      CRYPTO_SECRET_KEY: '${env:CRYPTO_SECRET_KEY}',
      GMAIL_NOTIFICATION_QUEUE_URL:
        '${self:custom.${self:custom.stage}.GMAIL_NOTIFICATION_QUEUE_URL}',
      GOOGLE_PUBSUB_TOPIC_NAME: '${env:GOOGLE_PUBSUB_TOPIC_NAME}',
    },
    lambdaHashingVersion: '20201221',
  },
  functions: { oauth, oauthCallback, gmailPush, saveEmail, keepPubSubAlive },
  resources: {
    Resources: {
      GmailNotificationQueue: {
        Type: 'AWS::SQS::Queue',
        Properties: {
          FifoQueue: true,
          ContentBasedDeduplication: true,
          QueueName:
            '${self:service}-${self:custom.stage}_GmailNotificationQueue.fifo',
          RedrivePolicy: {
            deadLetterTargetArn: {
              'Fn::GetAtt': ['GmailNotificationQueueDLQ', 'Arn'],
            },
            maxReceiveCount: 3,
          },
        },
      },
      GmailNotificationQueueDLQ: {
        Type: 'AWS::SQS::Queue',
        Properties: {
          FifoQueue: true,
          ContentBasedDeduplication: true,
          QueueName:
            '${self:service}-${self:custom.stage}_GmailNotificationQueueDLQ.fifo',
        },
      },
      GmailNotificationQueuePolicy: {
        Type: 'AWS::SQS::QueuePolicy',
        Properties: {
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'allow-lambda-messages',
                Effect: 'Allow',
                Principal: '*',
                Resource: {
                  'Fn::GetAtt': ['GmailNotificationQueue', 'Arn'],
                },
                Action: 'SQS:SendMessage',
                Condition: {
                  ArnEquals: {
                    'aws:SourceArn': {
                      'Fn::GetAtt': ['GmailPushLambdaFunction', 'Arn'],
                    },
                  },
                },
              },
            ],
          },
          Queues: [
            {
              Ref: 'GmailNotificationQueue',
            },
          ],
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
