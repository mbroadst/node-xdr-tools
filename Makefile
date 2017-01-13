REPORTER ?= spec
TESTS = ./test/*.test.js ./test/**/*.test.js ./test/**/**/*.test.js
NPM_BIN = ./node_modules/.bin

lint:
	$(NPM_BIN)/eslint server.js lib test

test: lint
	@if [ "$$GREP" ]; then \
		$(NPM_BIN)/mocha --globals setImmediate,clearImmediate -u tdd --check-leaks --colors -t 10000 --reporter $(REPORTER) -g "$$GREP" $(TESTS); \
	else \
		$(NPM_BIN)/mocha --globals setImmediate,clearImmediate -u tdd --check-leaks --colors -t 10000 --reporter $(REPORTER) $(TESTS); \
	fi

.PHONY: lint test
