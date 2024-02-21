import express from 'express';
import transbank from 'transbank-sdk';
import path from 'path';
import hbs from 'hbs';
import registerHelpers from './hbs-config.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'html');
app.engine('html', hbs.__express);
app.set('views', path.join(__dirname, 'html'));

app.use(express.static(path.join(__dirname, 'public')));

const port = 3000;
const { WebpayPlus } = transbank;

const sessionId = 'S-123456';
const returnUrl = `http://localhost:${port}/result`;

registerHelpers(hbs);

app.get('/', async(_,res)=>{
  // TODO: send html form
  res.render('make');
});

app.post('/order', async(req,res)=>{
  const { amount, buyOrder } = req.body;
  const createResponse = await (new WebpayPlus.Transaction()).create(buyOrder, sessionId, amount, returnUrl);
  const token = createResponse.token;
  const url = createResponse.url;

  res.locals = {
    token, url
  };
  res.render('payment');
});

app.get('/success',async (req, res)=>{
  const urlParams = new URLSearchParams(req.originalUrl.split('?')[1]||'');
  const token = urlParams.get('token_ws') || null;
  console.log({token})

  if ( !token || token === '' ){
    res.locals = {
      message: "",
      code: 400
    };
    res.render("error.html");
  }

  try {
    const commitResponse = await (new WebpayPlus.Transaction()).commit(token);

    res.locals = {...commitResponse};

    if(commitResponse.status==="AUTHORIZED"){
      res.render('success');
    }
    else {
      res.render('failed');
    }
  }catch(e) {
    res.locals = {
      message: e.message,
      code: 400
    };
    res.render("error.html");
  }
});

app.get('/receipt/:buyOrder', async (req, res)=>{
  // generate a simple pdf with the buyOrder
  const { buyOrder } = req.params;
  res.locals = {
    buyOrder
  };

  // get pdf content from /public/boleta.pdf
  const pdf = path.join(__dirname, 'public', 'boleta.pdf');

  res.sendFile(pdf);
})


app.listen(port, () => {
  console.log('Webpay PoC listening at http://localhost:' + port);
});
