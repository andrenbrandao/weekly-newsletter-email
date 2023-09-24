/* eslint-disable camelcase */
import 'source-map-support/register';

import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { formatJSONResponse } from '@libs/apiGateway';
import { middyfy } from '@libs/lambda';
import { google } from 'googleapis';
import { logger } from '@shared/logger';
import { getConnection } from '@libs/mongodb';
import { saveUser } from '@services/database/mongodb/repositories/UserRepository';

const login: APIGatewayProxyHandlerV2 = async (event, context) => {
  // Make sure to add this so you can re-use `conn` between function calls.
  // https://mongoosejs.com/docs/lambda.html
  context.callbackWaitsForEmptyEventLoop = false;
  const params = new URLSearchParams(event.body);

  // eslint-disable-next-line camelcase
  const oAuth2Client = new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
  );
  try {
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: params.get('credential'),
    });
    const payload = ticket.getPayload();
    console.log(payload);

    await getConnection();
    await saveUser({ email: payload.email });

    return {
      statusCode: 302,
      headers: {
        Location: 'http://localhost:3000/success',
      },
    };
  } catch (error) {
    logger.error(error);
    return formatJSONResponse({
      statusCode: 500,
      body: 'Internal server error',
    });
  }
};

export const main = middyfy(login);
