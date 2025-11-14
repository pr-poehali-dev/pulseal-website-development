'''
Business: Обработка текстовых задач через OpenAI GPT-4
Args: event - dict с httpMethod, body (userId, question)
      context - объект с request_id
Returns: HTTP response с ответом от ИИ
'''

import json
import os
import psycopg2
from datetime import datetime
from typing import Dict, Any
from openai import OpenAI

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    user_id = body_data.get('userId')
    question = body_data.get('question', '').strip()
    
    if not user_id or not question:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'userId and question are required'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    cur.execute(
        "SELECT free_requests_used FROM users WHERE id = %s",
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
    
    free_requests_used = user[0]
    
    cur.execute(
        """SELECT id, requests_total, requests_used, is_unlimited, expires_at 
           FROM subscriptions 
           WHERE user_id = %s AND is_active = TRUE 
           ORDER BY created_at DESC LIMIT 1""",
        (user_id,)
    )
    subscription = cur.fetchone()
    
    can_make_request = False
    is_free = False
    
    if subscription:
        sub_id, total, used, unlimited, expires = subscription
        if unlimited and datetime.now() < expires:
            can_make_request = True
        elif used < total:
            can_make_request = True
    elif free_requests_used < 10:
        can_make_request = True
        is_free = True
    
    if not can_make_request:
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'error': 'No requests left',
                'needSubscription': True
            }),
            'isBase64Encoded': False
        }
    
    client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Ты помощник для решения текстовых задач. Отвечай четко и по делу."},
            {"role": "user", "content": question}
        ],
        max_tokens=1000
    )
    
    answer = response.choices[0].message.content
    tokens = response.usage.total_tokens
    
    cur.execute(
        "INSERT INTO ai_requests (user_id, question, answer, tokens_used) VALUES (%s, %s, %s, %s)",
        (user_id, question, answer, tokens)
    )
    
    if is_free:
        cur.execute(
            "UPDATE users SET free_requests_used = free_requests_used + 1 WHERE id = %s",
            (user_id,)
        )
    elif subscription:
        cur.execute(
            "UPDATE subscriptions SET requests_used = requests_used + 1 WHERE id = %s",
            (sub_id,)
        )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'answer': answer,
            'tokensUsed': tokens,
            'requestsLeft': 10 - free_requests_used - 1 if is_free else (total - used - 1 if not unlimited else 999999)
        }),
        'isBase64Encoded': False
    }
