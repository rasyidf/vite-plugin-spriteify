//utils.test.ts
import { toCamelCase, toTitleCase } from '../utils';

describe('Utils', () => {
  describe('toCamelCase', () => {
    it('should convert string to camel case', () => {
      expect(toCamelCase('hello-world')).toBe('helloWorld');
      expect(toCamelCase('another_test_string')).toBe('anotherTestString');
    });
  });

  describe('toTitleCase', () => {
    it('should convert string to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
      expect(toTitleCase('another test string')).toBe('Another Test String');
    });
  });

});