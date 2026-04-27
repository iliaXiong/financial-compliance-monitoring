import { describe, it, expect } from 'vitest';
import { BlackScholesGreeksCalculator } from '../../../src/calculators/GreeksCalculator.js';
import { OptionType, GreeksParams } from '../../../src/types/index.js';

describe('BlackScholesGreeksCalculator', () => {
  const calculator = new BlackScholesGreeksCalculator();

  describe('calculateGreeks', () => {
    it('should calculate all Greeks for a call option', () => {
      const greeks = calculator.calculateGreeks(
        OptionType.CALL,
        100,  // spotPrice
        100,  // strike (ATM)
        1,    // timeToExpiry (1 year)
        0.2,  // volatility (20%)
        0.05  // riskFreeRate (5%)
      );

      expect(greeks.delta).toBeGreaterThan(0);
      expect(greeks.delta).toBeLessThan(1);
      expect(greeks.gamma).toBeGreaterThan(0);
      expect(greeks.theta).toBeLessThan(0); // Call theta is typically negative
      expect(greeks.vega).toBeGreaterThan(0);
      expect(greeks.rho).toBeGreaterThan(0); // Call rho is positive
    });

    it('should calculate all Greeks for a put option', () => {
      const greeks = calculator.calculateGreeks(
        OptionType.PUT,
        100,  // spotPrice
        100,  // strike (ATM)
        1,    // timeToExpiry (1 year)
        0.2,  // volatility (20%)
        0.05  // riskFreeRate (5%)
      );

      expect(greeks.delta).toBeLessThan(0);
      expect(greeks.delta).toBeGreaterThan(-1);
      expect(greeks.gamma).toBeGreaterThan(0);
      expect(greeks.theta).toBeLessThan(0); // Put theta is typically negative
      expect(greeks.vega).toBeGreaterThan(0);
      expect(greeks.rho).toBeLessThan(0); // Put rho is negative
    });
  });

  describe('calculateDelta', () => {
    it('should calculate delta for ATM call option', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const delta = calculator.calculateDelta(params);
      
      // ATM call delta should be around 0.5-0.65 (accounting for risk-free rate)
      expect(delta).toBeGreaterThan(0.5);
      expect(delta).toBeLessThan(0.7);
    });

    it('should calculate delta for ITM call option', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 110,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const delta = calculator.calculateDelta(params);
      
      // ITM call delta should be higher than ATM
      expect(delta).toBeGreaterThan(0.6);
      expect(delta).toBeLessThan(1);
    });

    it('should calculate delta for OTM call option', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 90,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const delta = calculator.calculateDelta(params);
      
      // OTM call delta should be lower than ATM
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThan(0.5);
    });

    it('should return 1 for deep ITM call at expiration', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 110,
        strike: 100,
        timeToExpiry: 0,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const delta = calculator.calculateDelta(params);
      expect(delta).toBe(1);
    });

    it('should return 0 for OTM call at expiration', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 90,
        strike: 100,
        timeToExpiry: 0,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const delta = calculator.calculateDelta(params);
      expect(delta).toBe(0);
    });

    it('should calculate negative delta for put option', () => {
      const params: GreeksParams = {
        optionType: OptionType.PUT,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const delta = calculator.calculateDelta(params);
      
      // ATM put delta should be around -0.5
      expect(delta).toBeLessThan(0);
      expect(delta).toBeGreaterThan(-1);
    });
  });

  describe('calculateGamma', () => {
    it('should calculate positive gamma for any option', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const gamma = calculator.calculateGamma(params);
      expect(gamma).toBeGreaterThan(0);
    });

    it('should have highest gamma for ATM options', () => {
      const atmParams: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const deepOtmParams: GreeksParams = {
        ...atmParams,
        spotPrice: 70  // Much deeper OTM
      };

      const atmGamma = calculator.calculateGamma(atmParams);
      const deepOtmGamma = calculator.calculateGamma(deepOtmParams);

      expect(atmGamma).toBeGreaterThan(deepOtmGamma);
    });

    it('should return 0 gamma at expiration', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 0,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const gamma = calculator.calculateGamma(params);
      expect(gamma).toBe(0);
    });
  });

  describe('calculateTheta', () => {
    it('should calculate negative theta for call option', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const theta = calculator.calculateTheta(params);
      expect(theta).toBeLessThan(0);
    });

    it('should calculate negative theta for put option', () => {
      const params: GreeksParams = {
        optionType: OptionType.PUT,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const theta = calculator.calculateTheta(params);
      expect(theta).toBeLessThan(0);
    });

    it('should return 0 theta at expiration', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 0,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const theta = calculator.calculateTheta(params);
      expect(theta).toBe(0);
    });
  });

  describe('calculateVega', () => {
    it('should calculate positive vega for any option', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const vega = calculator.calculateVega(params);
      expect(vega).toBeGreaterThan(0);
    });

    it('should have same vega for call and put with same parameters', () => {
      const callParams: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const putParams: GreeksParams = {
        ...callParams,
        optionType: OptionType.PUT
      };

      const callVega = calculator.calculateVega(callParams);
      const putVega = calculator.calculateVega(putParams);

      expect(callVega).toBeCloseTo(putVega, 6);
    });

    it('should return 0 vega at expiration', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 0,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const vega = calculator.calculateVega(params);
      expect(vega).toBe(0);
    });

    it('should have higher vega for longer time to expiry', () => {
      const shortParams: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 0.25,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const longParams: GreeksParams = {
        ...shortParams,
        timeToExpiry: 1
      };

      const shortVega = calculator.calculateVega(shortParams);
      const longVega = calculator.calculateVega(longParams);

      expect(longVega).toBeGreaterThan(shortVega);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very low volatility', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.01,
        riskFreeRate: 0.05
      };

      const greeks = calculator.calculateGreeks(
        params.optionType,
        params.spotPrice,
        params.strike,
        params.timeToExpiry,
        params.volatility,
        params.riskFreeRate
      );

      expect(greeks.delta).toBeGreaterThan(0);
      expect(greeks.gamma).toBeGreaterThan(0);
      expect(greeks.vega).toBeGreaterThan(0);
    });

    it('should handle very high volatility', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 1,
        volatility: 2.0,
        riskFreeRate: 0.05
      };

      const greeks = calculator.calculateGreeks(
        params.optionType,
        params.spotPrice,
        params.strike,
        params.timeToExpiry,
        params.volatility,
        params.riskFreeRate
      );

      expect(greeks.delta).toBeGreaterThan(0);
      expect(greeks.gamma).toBeGreaterThan(0);
      expect(greeks.vega).toBeGreaterThan(0);
    });

    it('should handle very short time to expiry', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 100,
        strike: 100,
        timeToExpiry: 0.01, // ~3.65 days
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const greeks = calculator.calculateGreeks(
        params.optionType,
        params.spotPrice,
        params.strike,
        params.timeToExpiry,
        params.volatility,
        params.riskFreeRate
      );

      expect(greeks.delta).toBeGreaterThan(0);
      expect(greeks.gamma).toBeGreaterThan(0);
    });

    it('should handle deep ITM call option', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 150,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const delta = calculator.calculateDelta(params);
      
      // Deep ITM call should have delta close to 1
      expect(delta).toBeGreaterThan(0.9);
      expect(delta).toBeLessThanOrEqual(1);
    });

    it('should handle deep OTM put option', () => {
      const params: GreeksParams = {
        optionType: OptionType.PUT,
        spotPrice: 150,
        strike: 100,
        timeToExpiry: 1,
        volatility: 0.2,
        riskFreeRate: 0.05
      };

      const delta = calculator.calculateDelta(params);
      
      // Deep OTM put should have delta close to 0
      expect(delta).toBeGreaterThanOrEqual(-1);
      expect(delta).toBeLessThan(0);
      expect(Math.abs(delta)).toBeLessThan(0.1); // Very close to 0
    });
  });
});
