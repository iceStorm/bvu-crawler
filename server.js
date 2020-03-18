

function sum(a, b)
{
    return new Promise((resolve, reject)=>
    {
        resolve(a + b);
    });
}

async function temp()
{
    let s = sum(5, 6)
        .then(resolved =>
            {
                console.log(resolved);
            });
    console.log(s);
}

temp();