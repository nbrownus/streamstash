
addInputPlugin('stdin')

addOutputPlugin('stdout')

addFilter(function (event) {
    event.done()
})