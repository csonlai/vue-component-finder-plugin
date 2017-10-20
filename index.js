"use strict";
var http = require('http');
var openInEditor = require('open-in-editor');
var url = require('url');
var fs = require('fs');
var spdy = require('spdy');
var hljs = require('highlight.js');

function VueComponentFinderPlugin(options) {
    options = options || {};
    this.editor = options.editor;
    this.port = 8493;
    this.key = options.key;
    this.cert = options.cert;
    this.editor = openInEditor.configure({
        editor: options.editor,
        cmd: options.cmd
    }, function(err) {
      console.error('Init Editor Failed:' + err);
    });
}

function serverCallback (self) {
    return function(req,res) {
        var query = url.parse(req.url, true, true).query;
        var openPath = query.open;
        var viewPath = query.view;
        var count = query.count || 10;
        var viewResult;
        var viewLineCount;
        var data = {};

        if (openPath) {
            self.editor.open(openPath);
            res.writeHead(200, {'Access-Control-Allow-Origin': '*'});
            res.end();
        }
        else if (viewPath) {
            viewResult = viewPath.match(/(.*)\:(\d+)/,'');
            if (viewResult) {
                viewPath = viewResult[1];
                viewLineCount = Number(viewResult[2]);
            }
            else {
                viewLineCount = 1;
            }
            if (fs.existsSync(viewPath)) {
                var fileContent = fs.readFileSync(viewPath, 'utf8');
                fileContent = hljs.highlightAuto(fileContent).value;

                if (fileContent) {
                    var fileContentList = fileContent.split('\n');
                    data = {
                        contentList: fileContentList,
                        viewLineCount: viewLineCount
                    };
                }
            }
            res.writeHead(200, {'Access-Control-Allow-Origin': '*'});
            res.end(JSON.stringify(data));
        }
    }
}

VueComponentFinderPlugin.prototype.apply = function(compiler) {
    var self = this;
    var server;
    var startServer = false;
    compiler.plugin('done', function() {
        if (startServer) {
            return;
        }
        startServer = true;
        // https
        if (self.key && self.cert) {
            server = spdy.createServer({
              key: self.key,
              cert: self.cert,
              spdy: {
                protocols: ["h2", "http/1.1"]
              }
            }, serverCallback(self));
        }
        // http
        else {
            server = http.createServer(serverCallback(self));
        }

        server.listen(self.port);
    });

};

module.exports = VueComponentFinderPlugin;