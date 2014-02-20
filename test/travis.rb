#!/usr/bin/env ruby
require 'fileutils'
require 'open3'

# Prepare build test folder
FileUtils.mkdir_p "test/output"

# Compile o-gallery normally (silent)
stdout, stderr, status = Open3.capture3 "sass --style compressed --scss main.scss test/output/main.css"
raise stderr unless status.success?
raise stderr if stderr.length > 0
raise "When $o-gallery-is-silent is set to true the module should not output any CSS" unless File.size('test/output/main.css') == 0
puts "Normal compile was correctly silent."
File.delete('test/output/main.css')

# Compile o-gallery with silent mode off
stdout, stderr, status = Open3.capture3 "sass --style compressed --scss test/not-silent.scss test/output/not-silent.css"
raise stderr unless status.success?
raise stderr if stderr.length > 0
raise "When compiled with silent mode off, the module should output some CSS" unless File.size('test/output/not-silent.css') > 0
puts "Non-silent compile correctly produced output"
File.delete('test/output/not-silent.css')

FileUtils.rmdir "test/output"
