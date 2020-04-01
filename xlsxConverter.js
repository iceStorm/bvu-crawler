module.exports = { download, saveToJSON };



async function toRawJSON(filename)
{
    try
    {
        if (filename.indexOf('xlsx') === -1)
        {
            console.log(`Error at: toRawJSON(): ${filename} not a Excel file.`);
            return;
        }

        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(filename);
        const sheet_name_list = workbook.SheetNames;
        var json = (XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]));
        return json;
    }
    catch (err)
    {
        console.log("Error at: toRawJSON(): " + err);
    }
}

async function replaceJSONKeys(rawJSON)
{
    try
    {
        rawJSON = JSON.stringify(rawJSON);
        rawJSON = rawJSON.replace(/"DANH MỤC.*?"/gm, "\"Ordinal\"");
        rawJSON = rawJSON.replace(/\\r\\n/gm, "");
        rawJSON = JSON.parse(rawJSON);
        return rawJSON;
    }
    catch (err)
    {
        console.log("Error at: replaceJSONKeys(): " + err);
    }
}

async function reformatJSON(json)
{
    try
    {
        let collection = [];
        let departmentCounter = -1;

        for (let i = 0; i < json.length; ++i)
        {
            if (typeof json[i].Ordinal === "number")  //  Số thứ tự của các môn học trong một Khoa
            {
                let notes = json[i]['__EMPTY_5'];
                let livetime = json[i]['__EMPTY_4'];
                if (notes != undefined)
                {
                    if (/\d/.test(notes.charAt(0)))    //  là số của giờ học
                    {
                        livetime = json[i]['__EMPTY_5'];
                        notes = json[i]['__EMPTY_4'] || "Không";
                    }
                    else
                    {
                        livetime = json[i]['__EMPTY_6'] || "Không";
                    }
                }
                else
                {
                    livetime = json[i]['__EMPTY_6'] || "Không";
                    notes = "Không";
                }


                let subject =
                {
                    Name: json[i]['__EMPTY'],
                    Class: json[i]['__EMPTY_1'],
                    Period: json[i]['__EMPTY_2'],
                    Teacher: json[i]['__EMPTY_3'],
                    Notes: notes,
                    LiveTime: livetime
                }
                
                collection[departmentCounter].Subjects.push(subject);
            }
            else
            {
                let dpIndex;
                let dpName;


                if (json[i].Ordinal.includes("Khoa")) //  Là bắt đầu một Khoa khác
                {
                    dpIndex = json[i].Ordinal.indexOf("Khoa");
                    dpName = json[i].Ordinal.substr(dpIndex);
                    let department = { Department: dpName, Subjects: [] };
                    collection.push(department);
                    ++departmentCounter;
                }
                else
                {
                    if (json[i].Ordinal.includes("Trung tâm Phát triển kỹ năng mềm"))
                    {
                        dpIndex = json[i].Ordinal.indexOf("Trung");
                        dpName = json[i].Ordinal.substr(dpIndex);
                        let department = { Department: dpName, Subjects: [] };
                        collection.push(department);
                        ++departmentCounter;
                    }
                }
            }
        }

        return collection;
    }
    catch (err)
    {
        console.log("Error at: reformatJSON(): " + err);
    }
}

async function saveToJSON(filename)
{
    try
    {
        let rawJSON = await toRawJSON(filename);
        // console.log("\nRaw: " + JSON.stringify(rawJSON));
        let replaced = await replaceJSONKeys(rawJSON);
        // console.log("\nReplaced: " + JSON.stringify(replaced));
        let formatted = await reformatJSON(replaced);
        // console.log("\nFormatted: " + JSON.stringify(formatted));
        
        filename = filename.replace("xlsx", "txt");
        const fs = require("fs");
        fs.writeFileSync(filename, JSON.stringify(formatted));
        return ("Finished convert to: " + filename);
    }
    catch (err)
    {
        console.log(err);
    }
}


async function download(filename)
{
    try
    {
        let stream = await new Promise((resolve, reject) =>
        {
            // https://www.convertapi.com/a
            const fs = require('fs');
            const api = fs.readFileSync('./convertKEY.txt', {encoding: 'utf8'});
            console.log('API key: ' + api);
            const convertapi = require('convertapi')(api,
            {
                conversionTimeout: 60,
                uploadTimeout: 60,
                downloadTimeout: 60
            });
    
    
            convertapi.convert('xlsx', { File: filename })
            .then(result =>
            {
                // get converted file url
                // console.log("Converted file url: " + result.file.url);

                // save to file
                return result.file.save(filename.replace("pdf", "xlsx"));
            })
            .then(filename =>
            {
                return resolve("File saved: " + filename);
            })
            .catch(err =>
            {
                return reject(err);
            });
        });

        return stream;
    }
    catch (err)
    {
        return err;
    }
}
