from fastapi import FastAPI

app = FastAPI()

@app.get('/')
async def root():
    return {'message': 'hello world'}

@app.get('/healthz')
async def healthz():
    return {'status': 'ok'}
