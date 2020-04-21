
let express = require('express');
let router = express.Router();
let followingSchedule = require('../../followingSchedule');


router.get('/followingSchedule', (req, res) =>
{
    res.status('200').send(followingSchedule.renderFollowingSchedule());
});



module.exports = router;