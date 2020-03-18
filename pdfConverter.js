module.exports = { letConvert };


async function letConvert(filename)
{
    try
    {
        // https://www.convertapi.com/a
        var api = '9RekTtUW7QwZTTYS';
        var convertapi = require('convertapi')(api,
        {
            conversionTimeout: 60,
            uploadTimeout: 60,
            downloadTimeout: 60
        });


        convertapi.convert('xlsx', { File: filename })
            .then(result =>
            {
                // get converted file url
                console.log("Converted file url: " + result.file.url);

                // save to file
                return result.file.save(filename.replace("pdf", "xlsx"));
            })
                .then(filename =>
                {
                    console.log("File saved: " + filename);
                    const xlsConverter = require('./xlsxConverter');
                    xlsConverter.saveToJSON(filename)
                        .then(() =>
                        {
                            return resolve();
                        });
                })
                    .catch(err =>
                    {
                        return reject(err);
                    });
    }
    catch (err)
    {
        console.log(err);
    }
}
