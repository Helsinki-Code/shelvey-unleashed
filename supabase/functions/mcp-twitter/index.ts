import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWITTER_API_URL = 'https://api.twitter.com/2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();

    const bearerToken = credentials?.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'TWITTER_BEARER_TOKEN not provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (tool) {
      case 'search_tweets':
        result = await searchTweets(bearerToken, args);
        break;
      case 'get_trends':
        result = await getTrends(bearerToken, args);
        break;
      case 'get_user':
        result = await getUser(bearerToken, args);
        break;
      case 'get_user_tweets':
        result = await getUserTweets(bearerToken, args);
        break;
      case 'post_tweet':
        result = await postTweet(credentials, args);
        break;
      case 'analyze_sentiment':
        result = await analyzeSentiment(bearerToken, args);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-twitter] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callTwitter(bearerToken: string, endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${TWITTER_API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function searchTweets(bearerToken: string, args: any) {
  const { query, maxResults, startTime, endTime } = args;

  const result = await callTwitter(bearerToken, '/tweets/search/recent', {
    query,
    max_results: String(maxResults || 10),
    start_time: startTime,
    end_time: endTime,
    'tweet.fields': 'created_at,public_metrics,author_id,conversation_id',
    'expansions': 'author_id',
    'user.fields': 'name,username,verified,profile_image_url',
  });

  return {
    tweets: result.data?.map((tweet: any) => ({
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
      metrics: tweet.public_metrics,
      authorId: tweet.author_id,
    })) || [],
    users: result.includes?.users || [],
    meta: result.meta,
  };
}

async function getTrends(bearerToken: string, args: any) {
  const { woeid } = args;

  // Note: Twitter v2 API trends endpoint requires elevated access
  // This is a simplified implementation
  const result = await callTwitter(bearerToken, '/tweets/search/recent', {
    query: 'is:verified -is:retweet lang:en',
    max_results: '100',
    'tweet.fields': 'created_at,public_metrics,entities',
  });

  // Extract hashtags from tweets to determine trends
  const hashtagCounts: Record<string, number> = {};
  result.data?.forEach((tweet: any) => {
    tweet.entities?.hashtags?.forEach((tag: any) => {
      const hashtag = tag.tag.toLowerCase();
      hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
    });
  });

  const trends = Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([hashtag, count]) => ({ hashtag, count }));

  return { trends, location: woeid || 'worldwide' };
}

async function getUser(bearerToken: string, args: any) {
  const { username, userId } = args;

  let endpoint = '/users';
  if (username) {
    endpoint = `/users/by/username/${username}`;
  } else if (userId) {
    endpoint = `/users/${userId}`;
  }

  const result = await callTwitter(bearerToken, endpoint, {
    'user.fields': 'created_at,description,entities,location,pinned_tweet_id,profile_image_url,protected,public_metrics,url,verified,verified_type',
  });

  return {
    user: result.data,
  };
}

async function getUserTweets(bearerToken: string, args: any) {
  const { userId, maxResults } = args;

  const result = await callTwitter(bearerToken, `/users/${userId}/tweets`, {
    max_results: String(maxResults || 10),
    'tweet.fields': 'created_at,public_metrics,entities',
  });

  return {
    tweets: result.data || [],
    meta: result.meta,
  };
}

async function postTweet(credentials: any, args: any) {
  const { text, replyToId } = args;

  // Posting requires OAuth 1.0a user context
  const apiKey = credentials.TWITTER_API_KEY;
  const apiSecret = credentials.TWITTER_API_SECRET;
  const accessToken = credentials.TWITTER_ACCESS_TOKEN;
  const accessSecret = credentials.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('Full Twitter OAuth credentials required for posting');
  }

  // For actual posting, you'd need to implement OAuth 1.0a signing
  // This is a placeholder that returns what would be posted
  return {
    posted: false,
    message: 'Tweet posting requires OAuth 1.0a implementation',
    wouldPost: {
      text,
      replyToId,
    },
  };
}

async function analyzeSentiment(bearerToken: string, args: any) {
  const { query, sampleSize } = args;

  // Search for tweets matching the query
  const result = await callTwitter(bearerToken, '/tweets/search/recent', {
    query: `${query} -is:retweet lang:en`,
    max_results: String(sampleSize || 50),
    'tweet.fields': 'created_at,public_metrics',
  });

  // Simple sentiment analysis based on engagement metrics
  const tweets = result.data || [];
  const totalTweets = tweets.length;
  
  let totalEngagement = 0;
  let totalLikes = 0;
  let totalRetweets = 0;
  let totalReplies = 0;

  tweets.forEach((tweet: any) => {
    const metrics = tweet.public_metrics || {};
    totalLikes += metrics.like_count || 0;
    totalRetweets += metrics.retweet_count || 0;
    totalReplies += metrics.reply_count || 0;
    totalEngagement += (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0);
  });

  return {
    query,
    sampleSize: totalTweets,
    metrics: {
      totalEngagement,
      avgEngagement: totalTweets > 0 ? totalEngagement / totalTweets : 0,
      totalLikes,
      totalRetweets,
      totalReplies,
    },
    engagementScore: totalTweets > 0 ? Math.min(100, (totalEngagement / totalTweets) * 10) : 0,
  };
}
