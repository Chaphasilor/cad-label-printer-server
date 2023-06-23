import fs from 'fs/promises'
import ftp from 'basic-ftp'
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'

const printjobName = `job.printjob`

const ftpClient = new ftp.Client()
ftpClient.ftp.verbose = true
try {
  await ftpClient.access({
    host: `eelp001.gsi.de`,
    user: `ftpprint`,
    password: `print`,
    secure: false
  })
  console.log(await ftpClient.list())
  await ftpClient.close()
}
catch(err) {
  console.log(err)
}

const app = new Koa()
const router = new Router();

router.get(`/`, async (ctx, next) => {
  ctx.body = {
    message: `EEL label printer server running`
  }
  await next()
});

router.post(`/uploadFile`, async (ctx, next) => {

  const body = ctx.request.body
  if (!body) {
    ctx.status = 400
    ctx.body = {
      error: `invalid body`
    }
    return
  } else if (!body.content) {
    ctx.status = 400
    ctx.body = {
      error: `missing property: \`content\``
    }
  }

  try {

    // create file from content
    await fs.writeFile(printjobName, body.content)

    if (ftpClient.closed) {
      await ftpClient.access({
        host: `eelp001.gsi.de`,
        user: `ftpprint`,
        password: `print`,
        secure: false
      })
    }
    await ftpClient.uploadFrom(printjobName, printjobName)
    await ftpClient.close()
  
    ctx.status = 201
    ctx.body = {
      message: `upload successful`
    }
    
  } catch (err) {
    ctx.status = 500
    ctx.body = {
      error: `couldn't upload file to printer`
    }
  }
  
  await next()
})

app
  // .use(async (ctx, next) => {
  //   console.log(`ctx.request.headers:`, ctx.request.headers)
  //   console.log(`ctx.request.method:`, ctx.request.method)
  //   ctx.body = `test`
  //   ctx.status = 200
  //   await next()
  // })
  .use(cors())
  .use(bodyParser({
    jsonLimit: `20mb`,
  }))
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(3000)
