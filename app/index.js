const spawn = require('child_process').spawn
const request = require('request')
const chalk = require('chalk')
const fs = require('fs')

const parserName = 'Driftnet'
const PID_FILE = '/var/run/driftnet.pid'
var child

function run() {
  console.log(`${parserName}(${chalk.blue('startup')}) : Monitoring on ${process.env.MONITOR_INTERFACE}`)
  console.log(`${parserName}(${chalk.blue('startup')}) : Using Image Path of ${process.env.IMAGE_PATH}`)
  console.log(`${parserName}(${chalk.blue('startup')}) : Starting up child process`)
  child = spawn('driftnet', [
    '-a', '-i', process.env.MONITOR_INTERFACE, 
    '-d', process.env.IMAGE_PATH
  ])

  // If we have been requested to shut down, then we should do so gracefully
  process.on('SIGUSR2', function(){
    console.log(`${parserName}(${chalk.blue('shutdown')}) : Shutting down child process`)
    child.stdin.pause()
    child.kill()
    process.exit()
  })

  // Pass anything from standard error directly to the log.
  child.stderr.on('data', function(data) {
    console.log(`${parserName}(${chalk.yellow('stderr')}) : ${data.toString().replace(/(\r\n|\n|\r)/gm)}`)
  })

  // If driftnet exits for some reason, we should log the event to the console
  // and then initiate a new instance to work from.
  child.on('close', function(code) {
    if (fs.existsSync(PID_FILE)){
      fs.unlinkSync(PID_FILE)
    }
    console.log(`${parserName}(${chalk.yellow('close')}) : Child terminated with code ${code}`)
    run()
  })

  // If driftnet is failing to start, then we need to log that event
  child.on('error', function(error) {
    console.log(`${parserName}(${chalk.red('close')}) : Could not start the child process`)
  })

  // When driftnet outputs data to standard output, we want to capture that
  // data, interpret it, and hand it off the image to the web service
  child.stdout.on('data', function(data){

    // First thing we went to do is strip out the line endings from the output
    var filenames = data.toString().split('\n')

    // Next we want to attempt to open the file that driftnet informed us of
    filenames.forEach(function (filename){

      // Check to see if there is any length to the filename var, if so,
      if (filename.length > 4){
        request.post({
          url: process.env.DOFLER_ADDRESS + '/api/image',
          formData: {
            'image': {
              'value': fs.createReadStream(filename),
              'options': {filename: filename.split('/').pop()}
            }
          },
          function (err, resp, body) {
            if (err) {
              console.error(`${parserName}(${chalk.red('upload')}) : Upload failed for ${filename}`)
            } else {
              console.log(`${parserName}(${chalk.green('upload')}) : Uploaded ${filename}`)
            }
          }
        })
      }
    })
  })
}

// Light this candle and get the parser running!
run()
