const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const Mssql = require('mssql');
const mssql = require('tedious');
const config = require('./Configurations/config');
const jwt = require('jsonwebtoken');

const stuRoutes = require('./api/routes/Student.js');
const studentRoutes = require('./api/routes/students.js');
const orderRoutes = require('./api/routes/orders.js');
const myLogModule = require('./log.js');

myLogModule.info('Node JS started');

app.set('secret', config.secret);

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const sqlConfig = {
    user: 'sa',
    password: 'Trigent@123',
    server: '10.0.1.93',
    database: 'NodeTestDB',
    port: 60218,
    options:
    {
        instanceName: 'SQLEXPRESS',
        encrypt: false
    }
};

Mssql.connect(sqlConfig, function (err) {
    if (err) console.log(err);
    console.log('connected');
});

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With,Content-Type,Accept,Authorization"
    );
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST,PATCH, GET, DELETE');
        return res.status(200).json({});
    }
    next();
});

app.post('/authenticate', (req, res) => {

    const request = new Mssql.Request();

    request.input('username', req.body.username);
    request.input('password', req.body.pwd);

    request.execute('dbo.ValidateUser', function (err, result) {
        console.log(result);
        var id = result.recordset[0];

        if (!id) return res.json({ message: 'Invalid Username / Password' });

        const payload = { check: true };

        var token = jwt.sign(payload, app.get('secret'), {
            expiresIn: 1400
        });
        res.json({
            message: 'authenticated',
            token: token
        });
    });

});

const ProtectedRoutes = express.Router();

app.use('/api', ProtectedRoutes);

ProtectedRoutes.use((req, res, next) => {
    var token = req.headers['access-token'];

    //decode token
    if (token) {
        jwt.verify(token, app.get('secret'), (err, decoded) => {
            if (err) return res.json({ error:err, success: false, message: 'Failed to authenticate token' });
            else {
                req.decoded = decoded;
                next();
            }
        });
    }
    else {
        return res.status(403).send({
            message: 'No token provided'
        });
    }
});

ProtectedRoutes.use('/students', studentRoutes);
ProtectedRoutes.use('/orders', orderRoutes);
ProtectedRoutes.use('/student', stuRoutes);

app.use((req, res, next) => {
    myLogModule.error('Error Handled')
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
})

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: error.message
    });
});

module.exports = app;