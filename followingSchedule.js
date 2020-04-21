module.exports = { getFollowingSchedules }

let fs = require('fs');



async function getFollowingSchedules()
{
    try
    {
        let currDate = await getCurrentDate();
        let currSegs = currDate.split('-');


        let stream = await new Promise((resolve, reject) =>
        {
            fs.readdir('./schedules/', (err, files) =>
            {
                if (err)
                    console.log(err);
                else
                {
                    let followingDates = [];
                    files.forEach((value, index) =>
                    {
                        let segments = value.split('-');
                        if (parseInt(currSegs[0], 10) <= parseInt(segments[0], 10))     //  so sánh ngày
                        {
                            if (parseInt(currSegs[1], 10) <= parseInt(segments[1], 10)) //  so sánh tháng
                                followingDates.push(value);
                        }
                    });


                    return resolve(followingDates);
                }
            });
        });


        return stream;
    }
    catch (err)
    {
        console.log(err);
    }
}


async function getCurrentDate()
{
    try
    {
        let stream = await new Promise((resolve, reject) =>
        {
            let d = new Date();
            let date = d.getDate();
            let dateString = (date >= 10) ? date:`0${date}`;
            let month = d.getMonth() + 1;
            let monthString = (month >= 10) ? month: `0${month}`;
            let year = d.getFullYear();
    
            return resolve(`${dateString}-${monthString}-${year}`);
        });


        return stream;
    }
    catch (err)
    {
        console.log(err);
    }
}