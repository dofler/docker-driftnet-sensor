const spawn = require('child_process').spawn
const request = require('request')
const fs = require('fs')

const PID_FILE = '/var/run/driftnet.pid'
var child

function run() {
  console.log('interface ', process.env.MONITOR_INTERFACE)
  console.log('image path ', process.env.IMAGE_PATH)
  child = spawn('driftnet', ['-a', '-i', process.env.MONITOR_INTERFACE, '-d', process.env.IMAGE_PATH])
  console.log('driftnet subprocess initiated')

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
              console.error('Upload Failed for ' + filename)
            } else {
              console.log('Uploaded ' + filename)
            }
          }
        })
      }
    })
  })

  // If driftnet closes, then capture the exit code and relay that to the log.
  child.on('close', function(code){
    console.log('driftnet terminated with code ' + code)
    if (fs.existsSync(PID_FILE)){
      fs.unlinkSync(PID_FILE)
    }
    run()
  })

  // If driftnet fails to start, then lets log that behavior
  child.on('error', function(){
    console.log('driftnet subprocess failed to spawn')
  })

  // If we have been requested to shut down, then we should do so gracefully
  process.on('SIGUSR2', function(){
    child.stdin.pause()
    child.kill()
    process.exit()
  })
}

// Light this candle and get the parser running!
run()
