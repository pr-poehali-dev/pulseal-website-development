'''
Business: Авторизация пользователей по номеру телефона через SMS-код
Args: event - dict с httpMethod, body (phone или phone+code)
      context - объект с атрибутами request_id, function_name
Returns: HTTP response с токеном или статусом верификации
'''

import json
import os
import random
import psycopg2
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
    phone = body_data.get('phone', '').strip()
    code = body_data.get('code', '').strip()
    
    if not phone:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Phone is required'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    if not code:
        verification_code = str(random.randint(100000, 999999))
        expires_at = datetime.now() + timedelta(minutes=5)
        
        cur.execute(
            "SELECT id FROM users WHERE phone = %s",
            (phone,)
        )
        user = cur.fetchone()
        
        if user:
            cur.execute(
                "UPDATE users SET verification_code = %s, code_expires_at = %s WHERE phone = %s",
                (verification_code, expires_at, phone)
            )
        else:
            cur.execute(
                "INSERT INTO users (phone, verification_code, code_expires_at) VALUES (%s, %s, %s)",
                (phone, verification_code, expires_at)
            )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'message': 'Code sent',
                'code': verification_code
            }),
            'isBase64Encoded': False
        }
    
    else:
        cur.execute(
            "SELECT id, verification_code, code_expires_at FROM users WHERE phone = %s",
            (phone,)
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
        
        user_id, stored_code, expires_at = user
        
        if datetime.now() > expires_at:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Code expired'}),
                'isBase64Encoded': False
            }
        
        if stored_code != code:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid code'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            "UPDATE users SET is_verified = TRUE WHERE id = %s",
            (user_id,)
        )
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'userId': user_id,
                'phone': phone
            }),
            'isBase64Encoded': False
        }
