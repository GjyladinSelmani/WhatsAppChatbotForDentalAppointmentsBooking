const http = require('http');
const fs = require('fs')
const port = 9000;

const server = http.createServer(function(req, res){

    res.writeHead(200, {
        'Content-Type': 'text/html'
    })
    fs.readFile('test.html', function(error, data){
        if (error){
            res.writeHead(404)
            res.write('Error: File not Found')
        } else {
            res.write(data)
        }
        res.end()
    })

    // res.write('Hello Node')
    // res.end()
})

server.listen(port, function(error){
    if (error) {
        console.log('Something went wrong', error)
    } else {
        console.log('Server is listening on port ' + port)
    }
})