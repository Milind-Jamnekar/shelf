Notes

# Setup basic nodejs project with nothing but npm. 1 thing learned 
- Now latest lts version of nodejs is right now is v26.13.1 
- Since v22.6 we can directly execute typescript code without transpile. but there is caveat in this. so basically node just strip down types before executing .ts file. that's it. that's how it is able to execute .ts file striping down types. but not all. 
- for example. enum cann't be stripped down. so we need to configure in `erasableSyntaxOnly: true` in tsconfig.json to avoid writing that code that node can't be striped. Also node does not type check. if you have any type error in code it can successfully execute that code. 

# Coded basic http server in node:http
- UTC time is central time is set where offset is defined for each region. for example. if UTC time is now 12:00 PM then indias UTC offset is UTC+5:30 that's means it is 12:00 + 5:30 hours = 5:30 PM
- ISO 8601 is standard set to represent UTC time like YYYY-MM-DDTHH:MM:SS.sssZ
For example, September 27, 2022 at 6 p.m. is represented as 2022-09-27T18:00:00.000Z.
