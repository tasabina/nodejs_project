const {body} = require('express-validator/check');
const User = require('../models/user');

exports.registerValidators = [
    body('email')
    .isEmail().withMessage('Input correct email')
    .custom(async (value) => {
        try {
            const user = await User.findOne({email: value});
            if(user) {
                return Promise.reject('This email already existed');
            }
        }catch (e) {
            console.error(e);
        }
    })
    .normalizeEmail(),

    body('password', 'Password should be at least 6 symbols')
    .isLength({min:6, max: 56})
    .isAlphanumeric()
    .trim(),

    body('confirm')
    .custom((value, {req}) => {
        if(value !== req.body.password) {
            throw new Error('Passwords do not match')
        }
        return true
    })
    .trim(),

    body('name')
    .isLength({min:3}).withMessage('Name should be at least 3 symbols')
    .trim()
];

exports.courseValidators = [
    body('title').isLength({min:3}).withMessage('Minimum 3 symbols').trim(),
    body('price').isNumeric().withMessage('Input correct price'),
    body('img', 'Input correct URL').isURL()
];