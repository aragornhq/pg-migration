describe('postgres client SSL configuration', () => {
  const OLD_ENV = process.env;
  const mockClient = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    mockClient.mockReset();
    jest.doMock('pg', () => ({
      Client: mockClient,
    }));
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it.each(['true', '1', 'require'])('enables SSL when PG_USE_SSL=%s', (value) => {
    process.env.PG_USE_SSL = value;

    require('../src/client');

    expect(mockClient).toHaveBeenCalledWith(
      expect.objectContaining({ ssl: { rejectUnauthorized: false } }),
    );
  });

  it('leaves SSL disabled when PG_USE_SSL is false', () => {
    process.env.PG_USE_SSL = 'false';

    require('../src/client');

    expect(mockClient).toHaveBeenCalledWith(expect.objectContaining({ ssl: undefined }));
  });
});
