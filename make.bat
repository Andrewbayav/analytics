@echo off

call mvn -Denv=dev clean package

rem java -server -Djava.ext.dirs=. -jar target\analytics-0.1.1-SNAPSHOT.jar 
