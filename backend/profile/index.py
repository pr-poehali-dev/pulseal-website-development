'''
Business: Получение профиля пользователя с подписками и статистикой
Args: event - dict с httpMethod, queryStringParameters (userId)
      context - объект с request_id
Returns: HTTP response с данными профиля
'''

import json
import os
import psycopg2
from datetime import datetime
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters', {}) or {}
    user_id = params.get('userId')
    
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'userId is required'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    cur.execute(
        "SELECT phone, free_requests_used, created_at FROM users WHERE id = %s",
        (user_id,)
    )
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User not found'}),
            'isBase64Encoded': False
        }
    
    phone, free_used, created_at = user
    
    cur.execute(
        """SELECT plan_type, requests_total, requests_used, is_unlimited, expires_at, is_active
           FROM subscriptions WHERE user_id = %s ORDER BY created_at DESC""",
        (user_id,)
    )
    subscriptions_data = cur.fetchall()
    
    subscriptions = []
    for sub in subscriptions_data:
        plan_type, total, used, unlimited, expires, active = sub
        subscriptions.append({
            'planType': plan_type,
            'requestsTotal': total,
            'requestsUsed': used,
            'isUnlimited': unlimited,
            'expiresAt': expires.isoformat() if expires else None,
            'isActive': active
        })
    
    cur.execute(
        """SELECT COUNT(*), SUM(tokens_used) FROM ai_requests WHERE user_id = %s""",
        (user_id,)
    )
    stats = cur.fetchone()
    total_requests, total_tokens = stats[0] or 0, stats[1] or 0
    
    cur.execute(
        """SELECT SUM(amount) FROM payments WHERE user_id = %s AND status = 'succeeded'""",
        (user_id,)
    )
    total_spent = cur.fetchone()[0] or 0
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'phone': phone,
            'freeRequestsUsed': free_used,
            'freeRequestsLeft': max(0, 10 - free_used),
            'memberSince': created_at.isoformat(),
            'subscriptions': subscriptions,
            'stats': {
                'totalRequests': total_requests,
                'totalTokens': total_tokens,
                'totalSpent': float(total_spent)
            }
        }),
        'isBase64Encoded': False
    }
