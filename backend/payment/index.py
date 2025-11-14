'''
Business: Создание платежей через ЮKassa и обработка webhook
Args: event - dict с httpMethod, body (userId, planType) или webhook data
      context - объект с request_id
Returns: HTTP response с URL платежа или статусом
'''

import json
import os
import psycopg2
import uuid
import requests
import base64
from datetime import datetime, timedelta
from typing import Dict, Any

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
    
    if 'event' in body_data:
        return handle_webhook(body_data)
    
    user_id = body_data.get('userId')
    plan_type = body_data.get('planType')
    
    if not user_id or not plan_type:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'userId and planType are required'}),
            'isBase64Encoded': False
        }
    
    plans = {
        'starter': {'price': 299, 'requests': 20},
        'pro': {'price': 399, 'requests': 30},
        'unlimited': {'price': 499, 'requests': None, 'unlimited': True}
    }
    
    if plan_type not in plans:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid plan type'}),
            'isBase64Encoded': False
        }
    
    plan = plans[plan_type]
    
    shop_id = os.environ['YUKASSA_SHOP_ID']
    secret_key = os.environ['YUKASSA_SECRET_KEY']
    
    idempotence_key = str(uuid.uuid4())
    payment_data = {
        "amount": {
            "value": f"{plan['price']}.00",
            "currency": "RUB"
        },
        "confirmation": {
            "type": "redirect",
            "return_url": "https://pulseai.ru/payment/success"
        },
        "capture": True,
        "description": f"PulseAI - {plan_type}",
        "metadata": {
            "user_id": str(user_id),
            "plan_type": plan_type
        }
    }
    
    auth_string = f"{shop_id}:{secret_key}"
    auth_bytes = auth_string.encode('utf-8')
    auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
    
    headers = {
        'Authorization': f'Basic {auth_b64}',
        'Idempotence-Key': idempotence_key,
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        'https://api.yookassa.ru/v3/payments',
        json=payment_data,
        headers=headers
    )
    
    if response.status_code != 200:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Payment creation failed'}),
            'isBase64Encoded': False
        }
    
    payment_response = response.json()
    payment_id = payment_response['id']
    confirmation_url = payment_response['confirmation']['confirmation_url']
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    cur.execute(
        """INSERT INTO payments (user_id, payment_id, amount, plan_type, status) 
           VALUES (%s, %s, %s, %s, 'pending')""",
        (user_id, payment_id, plan['price'], plan_type)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'paymentUrl': confirmation_url,
            'paymentId': payment_id
        }),
        'isBase64Encoded': False
    }


def handle_webhook(webhook_data: Dict[str, Any]) -> Dict[str, Any]:
    event_type = webhook_data.get('event')
    
    if event_type != 'payment.succeeded':
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'status': 'ignored'}),
            'isBase64Encoded': False
        }
    
    payment = webhook_data.get('object', {})
    payment_id = payment.get('id')
    metadata = payment.get('metadata', {})
    user_id = int(metadata.get('user_id', 0))
    plan_type = metadata.get('plan_type')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    cur.execute(
        "UPDATE payments SET status = 'succeeded', updated_at = %s WHERE payment_id = %s",
        (datetime.now(), payment_id)
    )
    
    plans = {
        'starter': {'requests': 20, 'unlimited': False},
        'pro': {'requests': 30, 'unlimited': False},
        'unlimited': {'requests': None, 'unlimited': True}
    }
    
    plan = plans.get(plan_type, {})
    expires_at = datetime.now() + timedelta(days=30) if plan.get('unlimited') else None
    
    cur.execute(
        """INSERT INTO subscriptions 
           (user_id, plan_type, requests_total, is_unlimited, expires_at) 
           VALUES (%s, %s, %s, %s, %s)""",
        (user_id, plan_type, plan.get('requests', 0), plan.get('unlimited', False), expires_at)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'status': 'ok'}),
        'isBase64Encoded': False
    }
