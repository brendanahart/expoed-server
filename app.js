const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const eaterRouter = require('./routes/eater');
const restaurantRouter = require('./routes/restaurants');
const paymentRouter = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use((req, res, next) => {
    if (req.originalUrl === "/api/payment/checkout/complete") {
        next();
    } else {
        bodyParser.json()(req, res, next);
    }
});

app.use('/api', indexRouter);
app.use('/api/person', eaterRouter);
app.use('/api/restaurant', restaurantRouter);
app.use('/api/payment', paymentRouter);

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));