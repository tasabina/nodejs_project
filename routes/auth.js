const {Router} = require('express');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {validationResult} = require('express-validator/check');
const router = Router();
const {registerValidators} = require('../utils/validators');

router.get('/login', async (req, res) => {
    res.render('auth/login', {
        title: 'Authorization',
        isLogin: true,
        loginError:req.flash('loginError'),
        registerError: req.flash('registerError')
    })
});

router.get('/logout', async (req, res) => {
    req.session.destroy(() => {
        res.redirect('/auth/login#login')
    });
});

router.post('/login', async (req, res) => {
    try {
        const {email, password} = req.body;
        const candidate = await User.findOne({email});
        if (candidate) {
            const areSame = await bcrypt.compare(password, candidate.password);
            if(areSame){
                req.session.user = candidate;
                req.session.isAuthenticated = true;
                req.session.save(err => {
                    if (err) {
                        throw err;
                    }
                    res.redirect('/');
                });
            } else {
                req.flash('loginError', 'Wrong password');
                res.redirect('/auth/login#login')
            }
        } else {
            req.flash('loginError', 'This user is not exist');
            res.redirect('/auth/login#login')
        }
    } catch (e) {
        console.log(e);
    }
});

router.post('/register', registerValidators, async (req, res) => {
    try {
        const {email, password, name} = req.body;
        const errors = validationResult(req);

        if(!errors.isEmpty()){
            req.flash('registerError', errors.array()[0].msg);
            return res.status(422).redirect('/auth/login#register');
        }
        const hashPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, name, password: hashPassword, cart: {items: []} });
        await user.save();
        res.redirect('/auth/login#login');
    } catch (e) {
        console.error(e);
    }
});

router.get('/reset', (req, res) => {
    res.render('auth/reset', {
        title: 'Reset password',
        error: req.flash('error')
    });
});

router.get('/password/:token', async (req, res) => {
    if(!req.params.token) {
        return res.redirect('/auth/login');
    }
    try {
        const user = await User.findOne({
            resetToken: req.params.token,
            resetTokenExp: {$gt: Date.now()}
        });

        if (!user) {
            return res.redirect('/auth/login')
        } else {
            res.render('auth/password', {
                title: 'Reset password',
                error: req.flash('error'),
                userId: user._id.toString(),
                token: req.params.token
            });
        }
    } catch (e) {
        console.error(e)
    }
});

router.post('/reset', (req,res) => {
    try{
        crypto.randomBytes(32, async (err, buffer) => {
            if(err) {
                req.flash('error', 'Something wrong. Please try again later.')
                res.redirect('/auth/reset');
            }

            const token = buffer.toString('hex');
            const candidate = await User.findOne({email:req.body.email});

            if (candidate) {
                candidate.resetToken = token;
                candidate.resetTokenExp = Date.now() + 60 * 60 * 1000;
                await candidate.save();
                res.redirect('/auth/login');
            } else {
                req.flash('error', 'Wrong email');
                res.redirect('/auth/reset');
            }
        })
    } catch (e) {
        console.error(e)
    }
});

router.post('/password', async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.body.userId,
            resetToken: req.body.token,
            resetTokenExp: {$gt: Date.now()}
        });

        if(user) {
            user.password = await bcrypt.hash(req.body.password, 10);
            user.resetToken = undefined;
            user.resetTokenExp = undefined;
            await user.save();
            res.redirect('/auth/login');
        } else {
            res.flash('loginError', 'Token is expared')
            res.redirect('/auth/login')
        }
    } catch (e) {
        console.error(e)
    }
})

module.exports = router;