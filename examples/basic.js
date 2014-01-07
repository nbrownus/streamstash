
addInputPlugin('stdin')

addOutputPlugin('stdout')

addFilter(function (event) {
    event.data.filter1 = true

    if (event.data.message == 'done') {
        return event.done()
    }

    event.next()
})

addFilter(function (event) {
    event.data.filter2 = true

    if (event.data.message == 'cancel') {
        return event.cancel()
    }

    event.next()
})
