all: test

test:
	NODE_ENV=test node_modules/ppunit/bin/ppunit -R list

test-cov:
	NODE_ENV=test node node_modules/istanbul/lib/cli.js --print=detail cover \
		node_modules/ppunit/bin/ppunit -- -R list

test-cov-html:
	NODE_ENV=test node node_modules/istanbul/lib/cli.js --print=summary cover \
		node_modules/ppunit/bin/ppunit -- -R list

	@echo ""
	@echo "****************************************************************************************"
	@echo "Results: file://$$PWD/coverage/lcov-report/index.html"
	@echo "****************************************************************************************"

.PHONY: all test test-cov test-cov-html
