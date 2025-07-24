from fastapi import FastAPI
from .routes import user

app = FastAPI()
app.include_router(user.router)

@app.get('/')
async def root():
    return {'message': 'hello world'}

@app.get('/healthz')
async def healthz():
    return {'status': 'ok'}
