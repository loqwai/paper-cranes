const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { DefinePlugin } = require('webpack')

module.exports = {
    mode: 'production',

    // Your other webpack configurations go here
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'), // Path to your built files
        },
        port: 6969, // Choose any port you prefer
        hot: false, // Enable hot module replacement
    },

    entry: {
        app: './index.js',
        'service-worker': './service-worker.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        publicPath: '/',
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /\.(png|jpe?g|gif|svg)$/i,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            outputPath: 'images',
                            name: '[name].[ext]',
                        },
                    },
                ],
            },
            {
                test: /\.html$/,
                use: ['html-loader'],
            },
            {
                test: /src\/audio\/analyzers\/.+\.js$/, // Regex to match JS files in the specific directory
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[contenthash]/[name].js',
                            outputPath: 'audio/analyzers',
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
            inject: true,
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'images', to: 'images' },
                { from: 'shaders', to: 'shaders' },
                { from: 'favicon.ico', to: 'favicon.ico' },
                { from: 'index.css', to: 'index.css' },
                { from: './src/utils', to: 'utils' },
            ],
        }),
        new DefinePlugin({
            WEBPACK_CACHE_NAME: JSON.stringify(new Date().toISOString()),
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    format: {
                        comments: false,
                    },
                },
                extractComments: false,
            }),
        ],
    },
}
