from fastapi.testclient import TestClient
import re

from apps.api.main import app

client = TestClient(app)

def test_healthz():
    response = client.get('/healthz')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


def test_start_user_returns_uuid():
    response = client.post('/user/start', json={'email': 'test@example.com'})
    assert response.status_code == 201
    data = response.json()
    assert 'userId' in data
    assert re.match(r"^[0-9a-f-]{36}$", data['userId'])
