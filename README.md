Notes

# Setup basic nodejs project with nothing but npm. two 1 thing learned 
- Now latest lts version of nodejs is right now is v26.13.1 
- Since v22 we can directly execute typescript code without transpile. but there is caveat in this. so basically node just strip down types before executing .ts file. that's it. that's how it is able to execute .ts file striping down types. but not all. 
- for example. enum cann't be stripped down. so we need to configure in `erasableSyntaxOnly: true` in tsconfig.json to avoid writing that code that node can't be striped. Also node does not type check. if you have any type error in code it can successfully execute that code. 